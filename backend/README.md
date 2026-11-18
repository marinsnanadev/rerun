# Rerun API

FastAPI backend for Rerun. It stores accounts and series, and serves the REST API the frontend in `../frontend` already speaks.

## Run it

Requires Python 3.12 or newer.

```bash
cd backend
python -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -e ".[dev]"
cp .env.example .env             # Windows: copy .env.example .env
uvicorn app.main:app --reload
```

The API listens on http://localhost:8000. Interactive docs are at http://localhost:8000/api/docs. Tables are created on startup, and the default SQLite file is `backend/rerun.db`.

## Test and check

```bash
pytest
ruff check .
mypy app
```

Tests run against an in-memory SQLite database, so they never touch `rerun.db`.

## Configuration

All variables are optional. See `.env.example`.

| Variable | Default | Purpose |
| --- | --- | --- |
| `RERUN_DATABASE_URL` | `sqlite:///./rerun.db` | SQLAlchemy URL |
| `RERUN_SESSION_COOKIE_NAME` | `rerun_session` | Name of the session cookie |
| `RERUN_SESSION_TTL_DAYS` | `30` | How long a sign-in lasts |
| `RERUN_COOKIE_SECURE` | `false` | HTTPS-only cookie. Turn on in production |

## Endpoints

All paths start with `/api`. JSON uses camelCase keys and `YYYY-MM-DD` dates. Errors are `{ "detail": "message" }`.

| Method | Path | Notes |
| --- | --- | --- |
| `GET` | `/health` | Liveness check |
| `POST` | `/auth/register` | 201, signs in. 409 if the username is taken |
| `POST` | `/auth/login` | 401 for a wrong password or unknown user |
| `POST` | `/auth/logout` | 204, revokes the session |
| `GET` | `/auth/me` | 401 without a valid session |
| `GET` | `/shows` | Your series, oldest finish date first |
| `POST` | `/shows` | 201 |
| `PATCH` | `/shows/{id}` | Partial update. `startedOn: null` clears the start date |
| `DELETE` | `/shows/{id}` | 204, also when it is already gone |
| `GET` | `/shows/{id}/watches` | Every watch of the series, most recent first |
| `POST` | `/shows/{id}/watches` | 201. Logs another watch and returns the updated series |
| `DELETE` | `/shows/{id}/watches/{watchId}` | Returns the updated series. 409 for the last remaining watch |

## Design notes

- **Sessions, not JWTs.** A sign-in is a row in `sessions`; the browser holds a random token in an HTTP-only, `SameSite=Lax` cookie. Only the token's SHA-256 is stored, and logout really revokes it.
- **Passwords** are hashed with Argon2id (`argon2-cffi`). Unknown usernames still cost one hash verification, and a hash made with older parameters is upgraded on login.
- **Ownership.** Every show query is scoped to the signed-in user. Someone else's show answers 404, the same as a missing one.
- **Validation mirrors the frontend** (`frontend/src/domain/validation.ts`), so both sides reject the same input with the same messages.
- **"Today" has a day of slack.** Dates are chosen in the browser's time zone, which the server can't see, so the server accepts dates up to one day past its own UTC date.
- **No CORS.** In development the Vite proxy makes `/api` same-origin. A separate production origin would need CORS with credentials.
- **CSRF.** Cookies are `SameSite=Lax` and every write is a non-GET JSON request, which covers the usual cross-site attacks. Revisit this if the API ever serves another origin.

## Watches

Each time you watch a series is a row in `watches`. A series always has at least one: creating it records the first. The series' own `startedOn` and `finishedOn` mirror its latest watch (the one finished last), which keeps listing and the rotation order simple. Adding or deleting a watch refreshes that mirror, and `PATCH /shows/{id}` with new dates corrects the latest watch.

## Known gaps

- No migrations yet: `create_all` only creates missing tables. Add Alembic before real data matters. If you created `rerun.db` before watches existed, delete it once so every series starts with a watch.
- No rate limiting on login and register.
