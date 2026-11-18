from fastapi import APIRouter, HTTPException, Request, Response
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError

from app.deps import AppSettings, CurrentUser, DbSession
from app.models import AuthSession, User
from app.schemas.auth import LoginRequest, RegisterRequest, UserOut, normalize_username
from app.security import (
    hash_password,
    hash_token,
    needs_rehash,
    verify_password,
    waste_verification_time,
)
from app.sessions import clear_session_cookie, create_session, set_session_cookie

router = APIRouter(prefix="/auth", tags=["auth"])


def _username_taken() -> HTTPException:
    return HTTPException(status_code=409, detail="That username is taken.")


@router.post("/register", response_model=UserOut, status_code=201)
def register(
    payload: RegisterRequest, response: Response, db: DbSession, settings: AppSettings
) -> User:
    if db.scalar(select(User.id).where(User.username == payload.username)) is not None:
        raise _username_taken()

    user = User(username=payload.username, password_hash=hash_password(payload.password))
    db.add(user)
    try:
        db.flush()
    except IntegrityError:
        # Someone registered the same name between the check above and now.
        db.rollback()
        raise _username_taken() from None

    token = create_session(db, user, settings)
    db.commit()
    set_session_cookie(response, token, settings)
    return user


@router.post("/login", response_model=UserOut)
def login(
    payload: LoginRequest, response: Response, db: DbSession, settings: AppSettings
) -> User:
    invalid = HTTPException(status_code=401, detail="Incorrect username or password.")

    user = db.scalar(select(User).where(User.username == normalize_username(payload.username)))
    if user is None:
        waste_verification_time(payload.password)
        raise invalid
    if not verify_password(user.password_hash, payload.password):
        raise invalid

    if needs_rehash(user.password_hash):
        user.password_hash = hash_password(payload.password)

    token = create_session(db, user, settings)
    db.commit()
    set_session_cookie(response, token, settings)
    return user


@router.post("/logout", status_code=204)
def logout(request: Request, db: DbSession, settings: AppSettings) -> Response:
    token = request.cookies.get(settings.session_cookie_name)
    if token:
        session = db.get(AuthSession, hash_token(token))
        if session is not None:
            db.delete(session)
            db.commit()

    response = Response(status_code=204)
    clear_session_cookie(response, settings)
    return response


@router.get("/me", response_model=UserOut)
def me(user: CurrentUser) -> User:
    return user
