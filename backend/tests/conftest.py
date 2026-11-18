from collections.abc import Iterator

import pytest
from fastapi.testclient import TestClient

from app.config import Settings
from app.main import create_app


@pytest.fixture
def client() -> Iterator[TestClient]:
    """A client on a fresh in-memory database. Cookies persist between its requests."""
    settings = Settings(database_url="sqlite://", _env_file=None)  # type: ignore[call-arg]
    with TestClient(create_app(settings)) as test_client:
        yield test_client
