from datetime import UTC, date, datetime, timedelta

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError

from app.models import AuthSession, Show, User


def test_health(client: TestClient) -> None:
    response = client.get("/api/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_datetimes_round_trip_as_utc(client: TestClient) -> None:
    expires = datetime.now(UTC) + timedelta(days=1)

    with client.app.state.session_factory() as db:  # type: ignore[attr-defined]
        user = User(username="ana", password_hash="x")
        db.add(user)
        db.flush()
        db.add(AuthSession(token_hash="t" * 64, user_id=user.id, expires_at=expires))
        db.commit()

        stored = db.scalars(select(AuthSession)).one()
        assert stored.expires_at.tzinfo is not None
        assert stored.expires_at == expires


def test_usernames_are_unique(client: TestClient) -> None:
    with client.app.state.session_factory() as db:  # type: ignore[attr-defined]
        db.add(User(username="ana", password_hash="x"))
        db.commit()
        db.add(User(username="ana", password_hash="y"))

        with pytest.raises(IntegrityError):
            db.commit()


def test_show_dates_must_be_ordered(client: TestClient) -> None:
    with client.app.state.session_factory() as db:  # type: ignore[attr-defined]
        user = User(username="ana", password_hash="x")
        db.add(user)
        db.flush()
        db.add(
            Show(
                user_id=user.id,
                title="The Office",
                genre="comedy",
                status="looping",
                started_on=date(2024, 3, 1),
                finished_on=date(2024, 2, 1),
            )
        )

        with pytest.raises(IntegrityError):
            db.commit()


def test_deleting_a_user_deletes_their_shows(client: TestClient) -> None:
    with client.app.state.session_factory() as db:  # type: ignore[attr-defined]
        user = User(username="ana", password_hash="x")
        db.add(user)
        db.flush()
        db.add(
            Show(
                user_id=user.id,
                title="Community",
                genre="comedy",
                status="looping",
                finished_on=date(2024, 2, 1),
            )
        )
        db.commit()

        db.delete(user)
        db.commit()

        assert db.scalars(select(Show)).all() == []
