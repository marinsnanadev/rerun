import pytest
from pydantic import ValidationError

from app.schemas.auth import LoginRequest, RegisterRequest


def test_register_normalizes_and_accepts_valid_input() -> None:
    request = RegisterRequest(username="  Ana_Silva-1.x ", password="12345678")

    assert request.username == "ana_silva-1.x"


@pytest.mark.parametrize("username", ["ab", "a" * 33, "ana silva", "ana@home", "ana\nbob", ""])
def test_register_rejects_bad_usernames(username: str) -> None:
    with pytest.raises(ValidationError):
        RegisterRequest(username=username, password="12345678")


def test_register_rejects_short_and_oversized_passwords() -> None:
    with pytest.raises(ValidationError):
        RegisterRequest(username="ana", password="1234567")
    with pytest.raises(ValidationError):
        RegisterRequest(username="ana", password="x" * 129)


def test_login_has_no_password_policy() -> None:
    assert LoginRequest(username="Ana", password="x").password == "x"
