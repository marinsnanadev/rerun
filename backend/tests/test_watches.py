from fastapi.testclient import TestClient
from sqlalchemy import select

from app.models import Watch

OFFICE = {
    "title": "The Office",
    "genre": "comedy",
    "status": "looping",
    "startedOn": "2024-04-01",
    "finishedOn": "2024-05-01",
}


def sign_in(client: TestClient, username: str = "ana") -> None:
    response = client.post(
        "/api/auth/register", json={"username": username, "password": "correct horse"}
    )
    assert response.status_code == 201, response.text


def create(client: TestClient) -> dict[str, object]:
    response = client.post("/api/shows", json=OFFICE)
    assert response.status_code == 201, response.text
    return response.json()  # type: ignore[no-any-return]


def watches(client: TestClient, show_id: object) -> list[dict[str, object]]:
    response = client.get(f"/api/shows/{show_id}/watches")
    assert response.status_code == 200, response.text
    return response.json()  # type: ignore[no-any-return]


def test_creating_a_show_records_its_first_watch(client: TestClient) -> None:
    sign_in(client)

    show = create(client)

    assert show["watchCount"] == 1
    [first] = watches(client, show["id"])
    assert first["startedOn"] == "2024-04-01"
    assert first["finishedOn"] == "2024-05-01"
    assert isinstance(first["id"], str)


def test_adding_a_watch_updates_the_shows_latest_dates(client: TestClient) -> None:
    sign_in(client)
    show = create(client)

    response = client.post(
        f"/api/shows/{show['id']}/watches", json={"startedOn": None, "finishedOn": "2024-09-01"}
    )

    assert response.status_code == 201
    updated = response.json()
    assert updated["watchCount"] == 2
    assert updated["finishedOn"] == "2024-09-01"
    assert updated["startedOn"] is None
    assert [item["finishedOn"] for item in watches(client, show["id"])] == [
        "2024-09-01",
        "2024-05-01",
    ]
    assert client.get("/api/shows").json()[0]["finishedOn"] == "2024-09-01"


def test_logging_an_older_watch_leaves_the_latest_dates_alone(client: TestClient) -> None:
    sign_in(client)
    show = create(client)

    response = client.post(
        f"/api/shows/{show['id']}/watches", json={"startedOn": None, "finishedOn": "2023-01-15"}
    )

    assert response.status_code == 201
    assert response.json()["watchCount"] == 2
    assert response.json()["finishedOn"] == "2024-05-01"
    assert response.json()["startedOn"] == "2024-04-01"


def test_two_watches_on_the_same_day_are_both_kept(client: TestClient) -> None:
    sign_in(client)
    show = create(client)

    response = client.post(
        f"/api/shows/{show['id']}/watches", json={"startedOn": None, "finishedOn": "2024-05-01"}
    )

    assert response.status_code == 201
    assert response.json()["watchCount"] == 2


def test_a_watch_is_checked_like_a_show(client: TestClient) -> None:
    sign_in(client)
    show = create(client)
    url = f"/api/shows/{show['id']}/watches"

    future = client.post(url, json={"startedOn": None, "finishedOn": "2999-01-01"})
    backwards = client.post(url, json={"startedOn": "2024-06-02", "finishedOn": "2024-06-01"})

    assert future.status_code == 422
    assert future.json() == {"detail": "The finish date can’t be in the future."}
    assert backwards.status_code == 422
    assert backwards.json() == {"detail": "The start date must be on or before the finish date."}
    assert len(watches(client, show["id"])) == 1


def test_deleting_the_latest_watch_falls_back_to_the_previous_one(client: TestClient) -> None:
    sign_in(client)
    show = create(client)
    added = client.post(
        f"/api/shows/{show['id']}/watches", json={"startedOn": None, "finishedOn": "2024-09-01"}
    )
    assert added.status_code == 201
    latest_id = watches(client, show["id"])[0]["id"]

    response = client.delete(f"/api/shows/{show['id']}/watches/{latest_id}")

    assert response.status_code == 200
    assert response.json()["watchCount"] == 1
    assert response.json()["finishedOn"] == "2024-05-01"
    assert response.json()["startedOn"] == "2024-04-01"


def test_the_last_watch_cannot_be_deleted(client: TestClient) -> None:
    sign_in(client)
    show = create(client)
    [only] = watches(client, show["id"])

    response = client.delete(f"/api/shows/{show['id']}/watches/{only['id']}")

    assert response.status_code == 409
    assert response.json() == {"detail": "A series needs at least one watch."}
    assert len(watches(client, show["id"])) == 1


def test_deleting_an_unknown_watch_is_a_404(client: TestClient) -> None:
    sign_in(client)
    show = create(client)

    response = client.delete(f"/api/shows/{show['id']}/watches/nope")

    assert response.status_code == 404
    assert response.json() == {"detail": "That watch no longer exists."}


def test_editing_the_dates_corrects_only_the_latest_watch(client: TestClient) -> None:
    sign_in(client)
    show = create(client)
    client.post(
        f"/api/shows/{show['id']}/watches", json={"startedOn": None, "finishedOn": "2024-09-01"}
    )

    response = client.patch(f"/api/shows/{show['id']}", json={"finishedOn": "2024-09-05"})

    assert response.status_code == 200
    assert response.json()["finishedOn"] == "2024-09-05"
    assert [item["finishedOn"] for item in watches(client, show["id"])] == [
        "2024-09-05",
        "2024-05-01",
    ]


def test_editing_other_fields_does_not_touch_watches(client: TestClient) -> None:
    sign_in(client)
    show = create(client)

    response = client.patch(
        f"/api/shows/{show['id']}", json={"title": "The Office (US)", "status": "pondering"}
    )

    assert response.status_code == 200
    assert response.json()["title"] == "The Office (US)"
    assert response.json()["watchCount"] == 1
    assert response.json()["finishedOn"] == "2024-05-01"


def test_marking_a_show_current_does_not_rewrite_its_watch_history(client: TestClient) -> None:
    sign_in(client)
    show = create(client)

    response = client.patch(
        f"/api/shows/{show['id']}", json={"status": "currently_watching", "startedOn": None}
    )

    assert response.status_code == 200
    assert response.json()["finishedOn"] == "2024-05-01"
    assert response.json()["startedOn"] is None
    [watch] = watches(client, show["id"])
    assert watch["startedOn"] == "2024-04-01"
    assert watch["finishedOn"] == "2024-05-01"


def test_watches_belong_to_their_owner(client: TestClient) -> None:
    sign_in(client, "ana")
    show = create(client)
    [watch] = watches(client, show["id"])
    client.post("/api/auth/logout")

    sign_in(client, "bob")
    responses = [
        client.get(f"/api/shows/{show['id']}/watches"),
        client.post(f"/api/shows/{show['id']}/watches", json={"finishedOn": "2024-09-01"}),
        client.delete(f"/api/shows/{show['id']}/watches/{watch['id']}"),
    ]

    assert [response.status_code for response in responses] == [404, 404, 404]


def test_watch_endpoints_require_a_session(client: TestClient) -> None:
    responses = [
        client.get("/api/shows/abc/watches"),
        client.post("/api/shows/abc/watches", json={"finishedOn": "2024-09-01"}),
        client.delete("/api/shows/abc/watches/def"),
    ]

    assert [response.status_code for response in responses] == [401, 401, 401]


def test_deleting_a_show_deletes_its_watches(client: TestClient) -> None:
    sign_in(client)
    show = create(client)
    client.post(
        f"/api/shows/{show['id']}/watches", json={"startedOn": None, "finishedOn": "2024-09-01"}
    )

    assert client.delete(f"/api/shows/{show['id']}").status_code == 204

    with client.app.state.session_factory() as db:  # type: ignore[attr-defined]
        assert db.scalars(select(Watch)).all() == []
