from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Runtime configuration, read from `RERUN_*` environment variables or `.env`."""

    model_config = SettingsConfigDict(env_prefix="RERUN_", env_file=".env", extra="ignore")

    database_url: str = "sqlite:///./rerun.db"
    session_cookie_name: str = "rerun_session"
    session_ttl_days: int = 30
    cookie_secure: bool = False


@lru_cache
def get_settings() -> Settings:
    return Settings()
