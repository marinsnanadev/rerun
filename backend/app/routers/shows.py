from datetime import date, datetime
from enum import Enum

from fastapi import APIRouter, HTTPException, Response
from sqlalchemy import delete, select

from app.deps import CurrentUser, DbSession
from app.models import Show, Watch, utcnow
from app.schemas.shows import (
    ShowCreate,
    ShowOut,
    ShowPatch,
    WatchCreate,
    WatchOut,
    check_dates,
)

router = APIRouter(prefix="/shows", tags=["shows"])

_DATE_FIELDS = ("started_on", "finished_on")


def _get_owned_show(db: DbSession, user: CurrentUser, show_id: str) -> Show:
    """Another person's show looks exactly like one that doesn't exist."""
    show = db.scalar(select(Show).where(Show.id == show_id, Show.user_id == user.id))
    if show is None:
        raise HTTPException(status_code=404, detail="That series no longer exists.")
    return show


def _new_watch(started_on: date | None, finished_on: date) -> Watch:
    # created_at is set here rather than by the column default, which only runs on flush and
    # would leave it empty while the latest watch is being worked out.
    return Watch(started_on=started_on, finished_on=finished_on, created_at=utcnow())


def _newest_first_key(watch: Watch) -> tuple[date, datetime]:
    return (watch.finished_on, watch.created_at)


def _sync_latest(show: Show) -> None:
    """Point the show's own dates at its latest watch: the one finished last."""
    latest = max(show.watches, key=_newest_first_key)
    show.started_on = latest.started_on
    show.finished_on = latest.finished_on


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
        watches=[_new_watch(payload.started_on, payload.finished_on)],
    )
    db.add(show)
    db.commit()
    return show


@router.patch("/{show_id}", response_model=ShowOut)
def update_show(show_id: str, payload: ShowPatch, user: CurrentUser, db: DbSession) -> Show:
    """Edit a show. Changing its dates corrects the latest watch; older watches stay as they are."""
    show = _get_owned_show(db, user, show_id)
    changes = payload.model_dump(exclude_unset=True)

    if any(field in changes for field in _DATE_FIELDS):
        started_on = changes.get("started_on", show.started_on)
        finished_on = changes.get("finished_on", show.finished_on)
        try:
            check_dates(started_on, finished_on)
        except ValueError as error:
            raise HTTPException(status_code=422, detail=str(error)) from None

        latest = max(show.watches, key=_newest_first_key)
        latest.started_on = started_on
        latest.finished_on = finished_on
        _sync_latest(show)

    for field, value in changes.items():
        if field not in _DATE_FIELDS:
            setattr(show, field, value.value if isinstance(value, Enum) else value)

    db.commit()
    return show


@router.delete("/{show_id}", status_code=204)
def delete_show(show_id: str, user: CurrentUser, db: DbSession) -> Response:
    """Idempotent: deleting something that is already gone still succeeds."""
    db.execute(delete(Show).where(Show.id == show_id, Show.user_id == user.id))
    db.commit()
    return Response(status_code=204)


@router.get("/{show_id}/watches", response_model=list[WatchOut])
def list_watches(show_id: str, user: CurrentUser, db: DbSession) -> list[Watch]:
    """Every time through the show, most recent first."""
    show = _get_owned_show(db, user, show_id)
    return sorted(show.watches, key=_newest_first_key, reverse=True)


@router.post("/{show_id}/watches", response_model=ShowOut, status_code=201)
def add_watch(show_id: str, payload: WatchCreate, user: CurrentUser, db: DbSession) -> Show:
    """Log another time through the show. Returns the show with its refreshed dates."""
    show = _get_owned_show(db, user, show_id)
    show.watches.append(_new_watch(payload.started_on, payload.finished_on))
    _sync_latest(show)
    db.commit()
    return show


@router.delete("/{show_id}/watches/{watch_id}", response_model=ShowOut)
def delete_watch(show_id: str, watch_id: str, user: CurrentUser, db: DbSession) -> Show:
    """Remove one watch. Returns the show with its refreshed dates."""
    show = _get_owned_show(db, user, show_id)
    watch = next((item for item in show.watches if item.id == watch_id), None)
    if watch is None:
        raise HTTPException(status_code=404, detail="That watch no longer exists.")
    if len(show.watches) == 1:
        raise HTTPException(status_code=409, detail="A series needs at least one watch.")

    show.watches.remove(watch)
    _sync_latest(show)
    db.commit()
    return show
