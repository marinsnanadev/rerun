from fastapi.testclient import TestClient

OFFICE = {
    "title": "The Office",
    "genre": "comedy",
    "status": "looping",
    "startedOn": None,
    "finishedOn": "2024-05-01",
}


def sign_in(client: TestClient, username: str = "ana") -> None:
    response = client.post(
        "/api/auth/register", json={"username": username, "password": "correct horse"}
    )
    assert response.status_code == 201, response.text


def create(client: TestClient, **overrides: object) -> dict[str, object]:
    response = client.post("/api/shows", json={**OFFICE, **overrides})
    assert response.status_code == 201, response.text
    return response.json()  # type: ignore[no-any-return]


def test_every_endpoint_requires_a_session(client: TestClient) -> None:
    responses = [
        client.get("/api/shows"),
        client.post("/api/shows", json=OFFICE),
        client.patch("/api/shows/abc", json={"status": "pondering"}),
        client.delete("/api/shows/abc"),
    ]

    assert [response.status_code for response in responses] == [401, 401, 401, 401]


def test_create_returns_the_show_in_the_frontend_shape(client: TestClient) -> None:
    sign_in(client)

    show = create(client, startedOn="2024-04-01")

    assert set(show) == {
        "id",
        "title",
        "genre",
        "status",
        "startedOn",
        "finishedOn",
        "watchCount",
    }
    assert show["watchCount"] == 1
    assert show["title"] == "The Office"
    assert show["startedOn"] == "2024-04-01"
    assert show["finishedOn"] == "2024-05-01"
    assert isinstance(show["id"], str)


def test_currently_watching_can_be_created_without_a_finished_date(client: TestClient) -> None:
    sign_in(client)

    show = create(client, status="currently_watching", startedOn=None, finishedOn=None)

    assert show["finishedOn"] is None
    assert show["watchCount"] == 0


def test_finishing_a_current_show_without_history_creates_its_first_watch(
    client: TestClient,
) -> None:
    sign_in(client)
    show = create(client, status="currently_watching", startedOn=None, finishedOn=None)

    response = client.patch(
        f"/api/shows/{show['id']}",
        json={"status": "looping", "startedOn": None, "finishedOn": "2024-09-01"},
    )

    assert response.status_code == 200
    assert response.json()["watchCount"] == 1
    assert response.json()["finishedOn"] == "2024-09-01"
    history = client.get(f"/api/shows/{show['id']}/watches").json()
    assert [watch["finishedOn"] for watch in history] == ["2024-09-01"]


def test_list_returns_only_my_shows_oldest_finish_first(client: TestClient) -> None:
    sign_in(client, "ana")
    create(client, title="Community", finishedOn="2024-09-19")
    create(client, title="The Office", finishedOn="2024-07-10")
    client.post("/api/auth/logout")

    sign_in(client, "bob")
    create(client, title="Dark")
    client.post("/api/auth/logout")

    client.post("/api/auth/login", json={"username": "ana", "password": "correct horse"})
    titles = [show["title"] for show in client.get("/api/shows").json()]

    assert titles == ["The Office", "Community"]


def test_create_cleans_up_the_title(client: TestClient) -> None:
    sign_in(client)

    assert create(client, title="  Modern   Family ")["title"] == "Modern Family"


def test_create_explains_what_is_wrong(client: TestClient) -> None:
    sign_in(client)

    cases = [
        ({"title": "   "}, "Enter a title."),
        ({"title": "x" * 121}, "Keep the title under 120 characters."),
        ({"finishedOn": "2999-01-01"}, "The finish date can’t be in the future."),
        (
            {"startedOn": "2024-06-01"},
            "The start date must be on or before the finish date.",
        ),
    ]
    for overrides, message in cases:
        response = client.post("/api/shows", json={**OFFICE, **overrides})

        assert response.status_code == 422
        assert response.json() == {"detail": message}


def test_create_rejects_unknown_choices_and_fields(client: TestClient) -> None:
    sign_in(client)

    for overrides in ({"genre": "western"}, {"status": "watching"}, {"rating": 5}):
        response = client.post("/api/shows", json={**OFFICE, **overrides})

        assert response.status_code == 422
        assert isinstance(response.json()["detail"], str)


def test_patch_changes_only_what_is_sent(client: TestClient) -> None:
    sign_in(client)
    show = create(client, startedOn="2024-04-01")

    response = client.patch(f"/api/shows/{show['id']}", json={"status": "pondering"})

    assert response.status_code == 200
    assert response.json() == {**show, "status": "pondering"}


def test_finishing_again_clears_the_start_date(client: TestClient) -> None:
    """The exact request the dashboard's "Finished it" button sends."""
    sign_in(client)
    show = create(client, startedOn="2024-04-01")

    response = client.patch(
        f"/api/shows/{show['id']}", json={"finishedOn": "2024-08-20", "startedOn": None}
    )

    assert response.status_code == 200
    assert response.json()["finishedOn"] == "2024-08-20"
    assert response.json()["startedOn"] is None


def test_patch_checks_dates_against_the_stored_ones(client: TestClient) -> None:
    sign_in(client)
    show = create(client, startedOn="2024-04-01")

    earlier_finish = client.patch(f"/api/shows/{show['id']}", json={"finishedOn": "2024-03-01"})
    later_start = client.patch(f"/api/shows/{show['id']}", json={"startedOn": "2024-06-01"})
    future_finish = client.patch(f"/api/shows/{show['id']}", json={"finishedOn": "2999-01-01"})

    assert earlier_finish.status_code == 422
    assert earlier_finish.json() == {
        "detail": "The start date must be on or before the finish date."
    }
    assert later_start.status_code == 422
    assert future_finish.json() == {"detail": "The finish date can’t be in the future."}
    assert client.get("/api/shows").json()[0]["finishedOn"] == "2024-05-01"


def test_completed_show_cannot_clear_its_finished_date(client: TestClient) -> None:
    sign_in(client)
    show = create(client)

    response = client.patch(f"/api/shows/{show['id']}", json={"finishedOn": None})

    assert response.status_code == 422
    assert response.json() == {"detail": "Choose the date you finished watching."}


def test_patch_of_a_missing_show_is_a_404(client: TestClient) -> None:
    sign_in(client)

    response = client.patch("/api/shows/nope", json={"status": "pondering"})

    assert response.status_code == 404
    assert response.json() == {"detail": "That series no longer exists."}


def test_nobody_can_touch_someone_elses_show(client: TestClient) -> None:
    sign_in(client, "ana")
    show = create(client)
    client.post("/api/auth/logout")

    sign_in(client, "bob")
    patched = client.patch(f"/api/shows/{show['id']}", json={"status": "pondering"})
    deleted = client.delete(f"/api/shows/{show['id']}")
    client.post("/api/auth/logout")

    client.post("/api/auth/login", json={"username": "ana", "password": "correct horse"})
    remaining = client.get("/api/shows").json()

    assert patched.status_code == 404
    assert deleted.status_code == 204
    assert [item["status"] for item in remaining] == ["looping"]


def test_delete_removes_the_show_and_can_be_repeated(client: TestClient) -> None:
    sign_in(client)
    show = create(client)

    first = client.delete(f"/api/shows/{show['id']}")
    second = client.delete(f"/api/shows/{show['id']}")

    assert first.status_code == 204
    assert second.status_code == 204
    assert client.get("/api/shows").json() == []
