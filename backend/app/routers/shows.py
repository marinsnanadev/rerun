from enum import Enum

from fastapi import APIRouter, HTTPException, Response
from sqlalchemy import delete, select

from app.deps import CurrentUser, DbSession
from app.models import Show
from app.schemas.shows import ShowCreate, ShowOut, ShowPatch, check_dates

router = APIRouter(prefix="/shows", tags=["shows"])


def _get_owned_show(db: DbSession, user: CurrentUser, show_id: str) -> Show:
    """Another person's show looks exactly like one that doesn't exist."""
    show = db.scalar(select(Show).where(Show.id == show_id, Show.user_id == user.id))
    if show is None:
        raise HTTPException(status_code=404, detail="That series no longer exists.")
    return show


@router.get("", response_model=list[ShowOut])
def list_shows(user: CurrentUser, db: DbSession) -> list[Show]:
    query = (
        select(Show)
        .where(Show.user_id == user.id)
        .order_by(Show.finished_on, Show.created_at)
    )
    return list(db.scalars(query))


@router.post("", response_model=ShowOut, status_code=201)
def create_show(payload: ShowCreate, user: CurrentUser, db: DbSession) -> Show:
    show = Show(
        user_id=user.id,
        title=payload.title,
        genre=payload.genre.value,
        status=payload.status.value,
        started_on=payload.started_on,
        finished_on=payload.finished_on,
    )
    db.add(show)
    db.commit()
    return show


@router.patch("/{show_id}", response_model=ShowOut)
def update_show(show_id: str, payload: ShowPatch, user: CurrentUser, db: DbSession) -> Show:
    show = _get_owned_show(db, user, show_id)
    changes = payload.model_dump(exclude_unset=True)

    if "started_on" in changes or "finished_on" in changes:
        try:
            check_dates(
                changes.get("started_on", show.started_on),
                changes.get("finished_on", show.finished_on),
            )
        except ValueError as error:
            raise HTTPException(status_code=422, detail=str(error)) from None

    for field, value in changes.items():
        setattr(show, field, value.value if isinstance(value, Enum) else value)

    db.commit()
    return show


@router.delete("/{show_id}", status_code=204)
def delete_show(show_id: str, user: CurrentUser, db: DbSession) -> Response:
    """Idempotent: deleting something that is already gone still succeeds."""
    db.execute(delete(Show).where(Show.id == show_id, Show.user_id == user.id))
    db.commit()
    return Response(status_code=204)
