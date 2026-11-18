from typing import cast

from sqlalchemy import MetaData, Table, inspect
from sqlalchemy.engine import Engine
from sqlalchemy.schema import CreateIndex, CreateTable

from app.models import Show, User


def migrate_finished_on_nullable(engine: Engine) -> None:
    """Allow in-progress shows to have no completed watch yet."""
    if not inspect(engine).has_table("shows"):
        return

    finished_on = next(
        column for column in inspect(engine).get_columns("shows") if column["name"] == "finished_on"
    )
    if not finished_on["nullable"]:
        if engine.dialect.name == "sqlite":
            _migrate_sqlite(engine)
        elif engine.dialect.name == "postgresql":
            with engine.begin() as connection:
                connection.exec_driver_sql(
                    "ALTER TABLE shows ALTER COLUMN finished_on DROP NOT NULL"
                )
        else:
            raise RuntimeError(
                f"Making shows.finished_on nullable is not supported for {engine.dialect.name}."
            )


def _migrate_sqlite(engine: Engine) -> None:
    metadata = MetaData()
    user_table = cast(Table, User.__table__)
    show_table = cast(Table, Show.__table__)
    user_table.to_metadata(metadata)
    replacement = show_table.to_metadata(metadata, name="shows_nullable")

    with engine.connect() as connection:
        connection.exec_driver_sql("PRAGMA foreign_keys=OFF")
        connection.commit()
        try:
            with connection.begin():
                connection.exec_driver_sql(
                    str(CreateTable(replacement).compile(dialect=engine.dialect))
                )
                connection.exec_driver_sql(
                    """
                    INSERT INTO shows_nullable (
                        id, user_id, title, genre, status, started_on, finished_on,
                        created_at, updated_at
                    )
                    SELECT
                        id, user_id, title, genre, status, started_on, finished_on,
                        created_at, updated_at
                    FROM shows
                    """
                )
                connection.exec_driver_sql("DROP TABLE shows")
                connection.exec_driver_sql("ALTER TABLE shows_nullable RENAME TO shows")
                for index in show_table.indexes:
                    connection.execute(CreateIndex(index))
        finally:
            connection.exec_driver_sql("PRAGMA foreign_keys=ON")
            connection.commit()
