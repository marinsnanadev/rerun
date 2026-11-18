from datetime import UTC, date, datetime, timedelta
from enum import StrEnum
from typing import Self

from pydantic import ConfigDict, field_validator, model_validator

from app.schemas.base import ApiModel

MAX_TITLE_LENGTH = 120


class Genre(StrEnum):
    ACTION = "action"
    ANIMATION = "animation"
    COMEDY = "comedy"
    CRIME = "crime"
    DOCUMENTARY = "documentary"
    DRAMA = "drama"
    FANTASY = "fantasy"
    HORROR = "horror"
    MYSTERY = "mystery"
    REALITY = "reality"
    ROMANCE = "romance"
    SCI_FI = "sci_fi"
    THRILLER = "thriller"
    OTHER = "other"


class ShowStatus(StrEnum):
    CURRENTLY_WATCHING = "currently_watching"
    LOOPING = "looping"
    REWATCH = "rewatch"
    ONE_TIME = "one_time"
    PONDERING = "pondering"


def latest_allowed_date() -> date:
    """The latest calendar date a show may carry.

    Dates are plain calendar days chosen in the viewer's time zone, and the server doesn't
    know that zone. Somewhere on Earth it can already be tomorrow (up to UTC+14), so
    allow one day past the server's UTC date rather than reject a legitimate "today".
    """
    return datetime.now(UTC).date() + timedelta(days=1)


def normalize_title(value: str) -> str:
    title = " ".join(value.split())
    if not title:
        raise ValueError("Enter a title.")
    if len(title) > MAX_TITLE_LENGTH:
        raise ValueError(f"Keep the title under {MAX_TITLE_LENGTH} characters.")
    return title


def check_dates(
    started_on: date | None, finished_on: date | None, *, latest: date | None = None
) -> None:
    """The date rules shared by creating a show and editing one. Raises ValueError."""
    ceiling = latest if latest is not None else latest_allowed_date()

    if finished_on is not None and finished_on > ceiling:
        raise ValueError("The finish date can’t be in the future.")
    if started_on is not None:
        if started_on > ceiling:
            raise ValueError("The start date can’t be in the future.")
        if finished_on is not None and started_on > finished_on:
            raise ValueError("The start date must be on or before the finish date.")


class ShowCreate(ApiModel):
    model_config = ConfigDict(extra="forbid")

    title: str
    genre: Genre
    status: ShowStatus
    started_on: date | None = None
    finished_on: date | None = None

    @field_validator("title")
    @classmethod
    def _valid_title(cls, value: str) -> str:
        return normalize_title(value)

    @model_validator(mode="after")
    def _valid_dates(self) -> Self:
        if self.finished_on is None and self.status != ShowStatus.CURRENTLY_WATCHING:
            raise ValueError("Choose the date you finished watching.")
        check_dates(self.started_on, self.finished_on)
        return self


_REQUIRED_FIELDS = {
    "title": "Title",
    "genre": "Genre",
    "status": "Status",
}


class ShowPatch(ApiModel):
    """A partial update. Only the fields that are sent change.

    `started_on` may be sent as null to clear it, so "absent" and "null" mean different things
    there. The date rules need the stored dates too, so they run in the route after merging.
    """

    model_config = ConfigDict(extra="forbid")

    title: str | None = None
    genre: Genre | None = None
    status: ShowStatus | None = None
    started_on: date | None = None
    finished_on: date | None = None

    @field_validator("title")
    @classmethod
    def _valid_title(cls, value: str | None) -> str | None:
        return None if value is None else normalize_title(value)

    @model_validator(mode="after")
    def _required_fields_stay_set(self) -> Self:
        for name, label in _REQUIRED_FIELDS.items():
            if name in self.model_fields_set and getattr(self, name) is None:
                raise ValueError(f"{label} can’t be empty.")
        return self


class WatchCreate(ApiModel):
    model_config = ConfigDict(extra="forbid")

    started_on: date | None = None
    finished_on: date

    @model_validator(mode="after")
    def _valid_dates(self) -> Self:
        check_dates(self.started_on, self.finished_on)
        return self


class WatchOut(ApiModel):
    id: str
    started_on: date | None
    finished_on: date


class ShowOut(ApiModel):
    id: str
    title: str
    genre: Genre
    status: ShowStatus
    # Dates of the latest completed watch, or null until one exists.
    started_on: date | None
    finished_on: date | None
    watch_count: int
