# Rerun

A tracker for people who rewatch the same handful of TV series on rotation.

Add the series you keep coming back to, log when you finished each one, and Rerun tells you which one to watch next: the one you haven't seen for the longest time.

## How the rotation works

1. Add a series with its title, genre, the date you finished watching it and, optionally, the date you started.
2. Choose **Add to looping** to put it in your rotation.
3. Rerun orders the rotation by last finished date, oldest first. The series at the top is what to watch next.
4. When you finish a series, log it with **Finished it**. It moves to the back of the line.

For example, if you finished Community on Sep 19, Modern Family on Aug 15 and The Office on Jul 10, The Office is up next because it has gone the longest without a rewatch.

Series can also be filed as **Would watch again**, **One time thing** or **Pondering**. These are for organization only and don't affect the rotation.

## Run it

You need two terminals: one for the API and one for the web app.

### Requirements

- [Python](https://www.python.org) 3.12 or newer
- [Node.js](https://nodejs.org) 20.19 or newer, with npm

### 1. Start the API

```bash
cd backend
python -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -e ".[dev]"
cp .env.example .env             # Windows: copy .env.example .env
uvicorn app.main:app --reload
```

The API runs at http://localhost:8000, with interactive docs at http://localhost:8000/api/docs.

### 2. Start the web app

```bash
cd frontend
npm install
cp .env.example .env             # Windows: copy .env.example .env
npm run dev
```

Open http://localhost:5173, choose **Create an account**, pick a username and a password with at least 8 characters, and add your first series.

The dev server forwards `/api` to the backend, so the browser sees a single origin and the session cookie just works.

### Try it without the backend

Set `VITE_API_MOCK=true` in `frontend/.env` and restart `npm run dev`. Everything is then stored in your browser's `localStorage`, and new accounts start with a few sample series. Mock passwords are stored as plain text, so don't reuse a real one.

### Run with Docker

```bash
docker compose up --build
```

Open http://localhost:8080. The web app is served by nginx, which forwards `/api` to the backend, and the SQLite database lives in a Docker volume named `rerun-data`, so it survives restarts. Stop with `Ctrl+C`; add `-v` to `docker compose down` to delete the data too.

### Build for production

```bash
cd frontend
npm run build     # typechecks, then writes the site to frontend/dist
npm run preview   # serves the build at http://localhost:4173
```

## Tests and checks

```bash
cd backend && pytest && ruff check . && mypy app
cd frontend && npm test && npm run lint && npm run typecheck
```

## Repository layout

```
rerun/
├── frontend/            React + TypeScript single-page app (Vite)
├── backend/             FastAPI + SQLAlchemy API
├── docker-compose.yml   Runs both together
└── .github/workflows/   Continuous integration
```

GitHub Actions runs all of these, and builds both Docker images, on every push and pull request.

See [frontend/README.md](frontend/README.md) and [backend/README.md](backend/README.md) for configuration, scripts and how each side is organized.
