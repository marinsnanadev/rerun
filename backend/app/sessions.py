from datetime import UTC, datetime, timedelta

from fastapi import Request, Response
from sqlalchemy import delete
from sqlalchemy.orm import Session

from app.config import Settings
from app.models import AuthSession, User
from app.security import hash_token, new_session_token


def get_settings_from(request: Request) -> Settings:
    settings: Settings = request.app.state.settings
    return settings


def create_session(db: Session, user: User, settings: Settings) -> str:
    """Store a new session and return the raw token for the cookie."""
    now = datetime.now(UTC)
    token = new_session_token()
    db.add(
        AuthSession(
            token_hash=hash_token(token),
            user_id=user.id,
            expires_at=now + timedelta(days=settings.session_ttl_days),
        )
    )
    # Housekeeping: expired sessions are useless, so clear them whenever someone signs in.
    db.execute(delete(AuthSession).where(AuthSession.expires_at <= now))
    return token


def set_session_cookie(response: Response, token: str, settings: Settings) -> None:
    response.set_cookie(
        key=settings.session_cookie_name,
        value=token,
        max_age=settings.session_ttl_days * 24 * 60 * 60,
        path="/",
        httponly=True,
        secure=settings.cookie_secure,
        samesite="lax",
    )


def clear_session_cookie(response: Response, settings: Settings) -> None:
    response.delete_cookie(
        key=settings.session_cookie_name,
        path="/",
        httponly=True,
        secure=settings.cookie_secure,
        samesite="lax",
    )
