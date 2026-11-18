from sqlalchemy import inspect

from app.db import make_engine
from app.migrations import migrate_finished_on_nullable


def test_migration_makes_existing_finish_dates_nullable_and_preserves_history() -> None:
    engine = make_engine("sqlite://")
    with engine.begin() as connection:
        connection.exec_driver_sql(
            "CREATE TABLE users (id VARCHAR(36) NOT NULL PRIMARY KEY)"
        )
        connection.exec_driver_sql(
            """
            CREATE TABLE shows (
                id VARCHAR(36) NOT NULL PRIMARY KEY,
                user_id VARCHAR(36) NOT NULL,
                title VARCHAR(120) NOT NULL,
                genre VARCHAR(20) NOT NULL,
                status VARCHAR(20) NOT NULL,
                started_on DATE,
                finished_on DATE NOT NULL,
                created_at DATETIME NOT NULL,
                updated_at DATETIME NOT NULL,
                CONSTRAINT ck_shows_dates_ordered
                    CHECK (started_on IS NULL OR started_on <= finished_on),
                FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
            )
            """
        )
        connection.exec_driver_sql(
            """
            CREATE TABLE watches (
                id VARCHAR(36) NOT NULL PRIMARY KEY,
                show_id VARCHAR(36) NOT NULL,
                started_on DATE,
                finished_on DATE NOT NULL,
                created_at DATETIME NOT NULL,
                FOREIGN KEY(show_id) REFERENCES shows(id) ON DELETE CASCADE
            )
            """
        )
        connection.exec_driver_sql(
            "INSERT INTO users (id) VALUES ('user-1')"
        )
        connection.exec_driver_sql(
            """
            INSERT INTO shows (
                id, user_id, title, genre, status, started_on, finished_on, created_at, updated_at
            ) VALUES (
                'show-1', 'user-1', 'The Office', 'comedy', 'looping',
                '2024-04-01', '2024-05-01', '2024-05-01', '2024-05-01'
            )
            """
        )
        connection.exec_driver_sql(
            """
            INSERT INTO watches (id, show_id, started_on, finished_on, created_at)
            VALUES ('watch-1', 'show-1', '2024-04-01', '2024-05-01', '2024-05-01')
            """
        )

    migrate_finished_on_nullable(engine)

    columns = inspect(engine).get_columns("shows")
    finished_on = next(column for column in columns if column["name"] == "finished_on")
    with engine.begin() as connection:
        preserved = connection.exec_driver_sql(
            "SELECT title, finished_on FROM shows WHERE id = 'show-1'"
        ).one()
        connection.exec_driver_sql(
            """
            INSERT INTO shows (
                id, user_id, title, genre, status, started_on, finished_on, created_at, updated_at
            ) VALUES (
                'show-2', 'user-1', 'Severance', 'drama', 'currently_watching',
                NULL, NULL, '2024-05-01', '2024-05-01'
            )
            """
        )
        foreign_key_errors = connection.exec_driver_sql("PRAGMA foreign_key_check").all()

    assert finished_on["nullable"]
    assert preserved == ("The Office", "2024-05-01")
    assert foreign_key_errors == []
    engine.dispose()
