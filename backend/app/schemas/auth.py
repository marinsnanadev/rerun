import re

from pydantic import Field, field_validator

from app.schemas.base import ApiModel

USERNAME_PATTERN = re.compile(r"[a-z0-9._-]{3,32}")
MIN_PASSWORD_LENGTH = 8

# Hashing cost grows with input size, so refuse absurd passwords outright.
MAX_PASSWORD_LENGTH = 128


def normalize_username(value: str) -> str:
    return value.strip().lower()


class RegisterRequest(ApiModel):
    username: str = Field(max_length=64)
    password: str = Field(max_length=MAX_PASSWORD_LENGTH)

    @field_validator("username")
    @classmethod
    def _valid_username(cls, value: str) -> str:
        username = normalize_username(value)
        if not USERNAME_PATTERN.fullmatch(username):
            raise ValueError(
                "Usernames use 3 to 32 letters, numbers, dots, dashes or underscores."
            )
        return username

    @field_validator("password")
    @classmethod
    def _valid_password(cls, value: str) -> str:
        if len(value) < MIN_PASSWORD_LENGTH:
            raise ValueError(f"Use at least {MIN_PASSWORD_LENGTH} characters for your password.")
        return value


class LoginRequest(ApiModel):
    """No rules beyond being present: accounts must keep working if the rules change."""

    username: str = Field(max_length=64)
    password: str = Field(max_length=MAX_PASSWORD_LENGTH)


class UserOut(ApiModel):
    id: str
    username: str
