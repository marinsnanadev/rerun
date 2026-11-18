from datetime import UTC, datetime, timedelta

from fastapi.testclient import TestClient
from sqlalchemy import select, update

from app.models import AuthSession, User

CREDENTIALS = {"username": "ana", "password": "correct horse"}


def register(client: TestClient, **overrides: str) -> None:
    response = client.post("/api/auth/register", json={**CREDENTIALS, **overrides})
    assert response.status_code == 201, response.text


def test_register_signs_the_user_in(client: TestClient) -> None:
    response = client.post("/api/auth/register", json=CREDENTIALS)

    assert response.status_code == 201
    body = response.json()
    assert body["username"] == "ana"
    assert set(body) == {"id", "username"}

    me = client.get("/api/auth/me")
    assert me.status_code == 200
    assert me.json() == body


def test_register_normalizes_the_username(client: TestClient) -> None:
    response = client.post(
        "/api/auth/register", json={"username": "  Ana.Silva ", "password": "correct horse"}
    )

    assert response.status_code == 201
    assert response.json()["username"] == "ana.silva"


def test_register_rejects_a_taken_username_in_any_case(client: TestClient) -> None:
    register(client)

    response = client.post("/api/auth/register", json={**CREDENTIALS, "username": "ANA"})

    assert response.status_code == 409
    assert response.json() == {"detail": "That username is taken."}


def test_register_explains_invalid_credentials(client: TestClient) -> None:
    short_name = client.post("/api/auth/register", json={**CREDENTIALS, "username": "ab"})
    bad_chars = client.post("/api/auth/register", json={**CREDENTIALS, "username": "ana silva"})
    short_password = client.post("/api/auth/register", json={**CREDENTIALS, "password": "short"})

    for response in (short_name, bad_chars):
        assert response.status_code == 422
        assert response.json() == {
            "detail": "Usernames use 3 to 32 letters, numbers, dots, dashes or underscores."
        }
    assert short_password.status_code == 422
    assert short_password.json() == {"detail": "Use at least 8 characters for your password."}


def test_register_with_a_missing_field_gets_a_generic_message(client: TestClient) -> None:
    response = client.post("/api/auth/register", json={"username": "ana"})

    assert response.status_code == 422
    assert isinstance(response.json()["detail"], str)


def test_passwords_are_stored_hashed(client: TestClient) -> None:
    register(client)

    with client.app.state.session_factory() as db:  # type: ignore[attr-defined]
        stored = db.scalars(select(User)).one().password_hash

    assert stored != CREDENTIALS["password"]
    assert stored.startswith("$argon2")


def test_session_cookie_is_http_only(client: TestClient) -> None:
    response = client.post("/api/auth/register", json=CREDENTIALS)

    cookie = response.headers["set-cookie"].lower()
    assert cookie.startswith("rerun_session=")
    assert "httponly" in cookie
    assert "samesite=lax" in cookie
    assert "path=/" in cookie


def test_only_a_hash_of_the_session_token_is_stored(client: TestClient) -> None:
    client.post("/api/auth/register", json=CREDENTIALS)
    token = client.cookies["rerun_session"]

    with client.app.state.session_factory() as db:  # type: ignore[attr-defined]
        stored = db.scalars(select(AuthSession)).one().token_hash

    assert stored != token
    assert len(stored) == 64


def test_login_after_logout(client: TestClient) -> None:
    register(client)
    client.post("/api/auth/logout")

    response = client.post("/api/auth/login", json={**CREDENTIALS, "username": "Ana"})

    assert response.status_code == 200
    assert response.json()["username"] == "ana"
    assert client.get("/api/auth/me").status_code == 200


def test_login_rejects_a_wrong_password_and_an_unknown_user_the_same_way(
    client: TestClient,
) -> None:
    register(client)
    client.post("/api/auth/logout")

    wrong_password = client.post("/api/auth/login", json={**CREDENTIALS, "password": "nope nope"})
    unknown_user = client.post("/api/auth/login", json={**CREDENTIALS, "username": "bob"})

    for response in (wrong_password, unknown_user):
        assert response.status_code == 401
        assert response.json() == {"detail": "Incorrect username or password."}


def test_me_requires_a_session(client: TestClient) -> None:
    response = client.get("/api/auth/me")

    assert response.status_code == 401
    assert response.json() == {"detail": "Sign in to continue."}


def test_logout_ends_the_session_for_good(client: TestClient) -> None:
    register(client)
    token = client.cookies["rerun_session"]

    response = client.post("/api/auth/logout")

    assert response.status_code == 204
    assert client.get("/api/auth/me").status_code == 401

    # Replaying the old cookie must not work: the session is gone on the server too.
    client.cookies.set("rerun_session", token)
    assert client.get("/api/auth/me").status_code == 401


def test_logout_without_a_session_is_fine(client: TestClient) -> None:
    assert client.post("/api/auth/logout").status_code == 204


def test_expired_sessions_are_refused(client: TestClient) -> None:
    register(client)

    with client.app.state.session_factory() as db:  # type: ignore[attr-defined]
        db.execute(update(AuthSession).values(expires_at=datetime.now(UTC) - timedelta(seconds=1)))
        db.commit()

    assert client.get("/api/auth/me").status_code == 401


def test_a_forged_cookie_is_refused(client: TestClient) -> None:
    client.cookies.set("rerun_session", "not-a-real-token")

    assert client.get("/api/auth/me").status_code == 401
