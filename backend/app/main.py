from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import APIRouter, FastAPI
from sqlalchemy.orm import sessionmaker

from app import models  # noqa: F401  (registers the tables on Base.metadata)
from app.config import Settings, get_settings
from app.db import Base, make_engine


def create_app(settings: Settings | None = None) -> FastAPI:
    settings = settings or get_settings()
    engine = make_engine(settings.database_url)

    @asynccontextmanager
    async def lifespan(_app: FastAPI) -> AsyncIterator[None]:
        # Good enough until the schema needs migrations (see the README).
        Base.metadata.create_all(engine)
        yield
        engine.dispose()

    app = FastAPI(
        title="Rerun API",
        version="0.1.0",
        lifespan=lifespan,
        docs_url="/api/docs",
        openapi_url="/api/openapi.json",
        redoc_url=None,
    )
    app.state.settings = settings
    app.state.session_factory = sessionmaker(engine, expire_on_commit=False)

    api = APIRouter(prefix="/api")

    @api.get("/health", tags=["meta"])
    def health() -> dict[str, str]:
        return {"status": "ok"}

    app.include_router(api)
    return app


app = create_app()
