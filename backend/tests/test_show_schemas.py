from datetime import UTC, date, datetime, timedelta

import pytest
from pydantic import ValidationError

from app.schemas.shows import (
    ShowCreate,
    ShowPatch,
    WatchCreate,
    check_dates,
    latest_allowed_date,
    normalize_title,
)

VALID = {
    "title": "The Office",
    "genre": "comedy",
    "status": "looping",
    "startedOn": None,
    "finishedOn": "2024-05-01",
}


def test_create_accepts_the_frontend_payload() -> None:
    show = ShowCreate.model_validate(VALID)

    assert show.title == "The Office"
    assert show.finished_on == date(2024, 5, 1)
    assert show.started_on is None


def test_title_is_trimmed_and_collapsed() -> None:
    assert normalize_title("  Modern \t  Family\n") == "Modern Family"


@pytest.mark.parametrize("title", ["", "   ", "x" * 121])
def test_bad_titles_are_rejected(title: str) -> None:
    with pytest.raises(ValidationError):
        ShowCreate.model_validate({**VALID, "title": title})


@pytest.mark.parametrize(
    ("field", "value"),
    [("genre", "western"), ("status", "watching"), ("finishedOn", "2024-02-31"), ("finishedOn", "")],
)
def test_bad_values_are_rejected(field: str, value: str) -> None:
    with pytest.raises(ValidationError):
        ShowCreate.model_validate({**VALID, field: value})


def test_unknown_fields_are_rejected() -> None:
    with pytest.raises(ValidationError):
        ShowCreate.model_validate({**VALID, "rating": 5})


def test_start_must_not_be_after_finish() -> None:
    with pytest.raises(ValidationError, match="on or before the finish date"):
        ShowCreate.model_validate({**VALID, "startedOn": "2024-05-02"})


def test_same_day_start_and_finish_is_fine() -> None:
    ShowCreate.model_validate({**VALID, "startedOn": "2024-05-01"})


def test_dates_cannot_be_far_in_the_future() -> None:
    with pytest.raises(ValidationError, match="finish date can’t be in the future"):
        ShowCreate.model_validate({**VALID, "finishedOn": "2999-01-01"})


def test_check_dates_allows_a_day_of_slack_for_time_zones() -> None:
    utc_today = datetime.now(UTC).date()

    assert latest_allowed_date() == utc_today + timedelta(days=1)
    check_dates(None, utc_today + timedelta(days=1))
    with pytest.raises(ValueError, match="finish date"):
        check_dates(None, utc_today + timedelta(days=2))


def test_check_dates_reports_a_future_start() -> None:
    latest = date(2024, 1, 1)

    with pytest.raises(ValueError, match="start date can’t be in the future"):
        check_dates(date(2024, 1, 2), date(2024, 1, 1), latest=latest)


def test_patch_tells_absent_from_null() -> None:
    cleared = ShowPatch.model_validate({"startedOn": None})
    untouched = ShowPatch.model_validate({"status": "pondering"})

    assert cleared.model_dump(exclude_unset=True) == {"started_on": None}
    assert untouched.model_dump(exclude_unset=True) == {"status": "pondering"}


@pytest.mark.parametrize("field", ["title", "genre", "status", "finishedOn"])
def test_patch_cannot_null_required_fields(field: str) -> None:
    with pytest.raises(ValidationError, match="can’t be empty"):
        ShowPatch.model_validate({field: None})


def test_a_watch_follows_the_same_date_rules() -> None:
    WatchCreate.model_validate({"startedOn": None, "finishedOn": "2024-05-01"})

    with pytest.raises(ValidationError, match="on or before the finish date"):
        WatchCreate.model_validate({"startedOn": "2024-05-02", "finishedOn": "2024-05-01"})
    with pytest.raises(ValidationError, match="finish date can’t be in the future"):
        WatchCreate.model_validate({"finishedOn": "2999-01-01"})
    with pytest.raises(ValidationError):
        WatchCreate.model_validate({"startedOn": None})
