from datetime import UTC, datetime
from typing import Annotated

from fastapi import Depends, HTTPException, Request
from sqlalchemy.orm import Session

from app.config import Settings
from app.db import get_db
from app.models import AuthSession, User
from app.security import hash_token
from app.sessions import get_settings_from

DbSession = Annotated[Session, Depends(get_db)]
AppSettings = Annotated[Settings, Depends(get_settings_from)]


def get_current_user(request: Request, db: DbSession, settings: AppSettings) -> User:
    unauthorized = HTTPException(status_code=401, detail="Sign in to continue.")

    token = request.cookies.get(settings.session_cookie_name)
    if not token:
        raise unauthorized

    session = db.get(AuthSession, hash_token(token))
    if session is None:
        raise unauthorized

    if session.expires_at <= datetime.now(UTC):
        db.delete(session)
        db.commit()
        raise unauthorized

    return session.user


CurrentUser = Annotated[User, Depends(get_current_user)]
