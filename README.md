# Rerun

A tracker for people who rewatch the same handful of TV series on rotation.

Add the series you keep coming back to, log when you finished each one, and Rerun tells you which one to watch next: the one you haven't seen for the longest time.

## Contents

- [How the rotation works](#how-the-rotation-works)
- [What you need](#what-you-need)
- [Get the code](#get-the-code)
- [Option 1: run with Docker](#option-1-run-with-docker)
- [Option 2: run it locally for development](#option-2-run-it-locally-for-development)
- [Option 3: try the interface without a backend](#option-3-try-the-interface-without-a-backend)
- [Your first five minutes](#your-first-five-minutes)
- [Ports and settings](#ports-and-settings)
- [Tests and checks](#tests-and-checks)
- [Troubleshooting](#troubleshooting)
- [Repository layout](#repository-layout)

## How the rotation works

1. Add a series with its title and genre. Add the watch dates if it is already finished, or choose **Currently watching** without entering a finish date.
2. Choose **Add to looping** to put it in your rotation.
3. Rerun orders the rotation by last finished date, oldest first. The series at the top is what to watch next.
4. Mark a series **Currently watching** in the library while it is in progress. When you finish it, choose **Finished it** and confirm the date; choose a library list if it was currently watching. A looping series moves to the back of the line.

For example, if you finished Community on Sep 19, Modern Family on Aug 15 and The Office on Jul 10, The Office is up next because it has gone the longest without a rewatch.

Series can also be filed as **Would watch again**, **One time thing** or **Pondering**. These are for organization only and don't affect the rotation.

Every time you watch a series is kept. **History** on a series lists all of them, lets you log one from the past and remove a mistaken one. **Edit** changes the title, genre, list and the dates of the latest watch.

## What you need

Pick the option you want to use. You only need the tools for that option.

| Tool | Needed for | Version | Check it |
| --- | --- | --- | --- |
| [Git](https://git-scm.com/downloads) | Getting the code | any | `git --version` |
| [Docker Desktop](https://www.docker.com/products/docker-desktop/) (or Docker Engine with Compose) | Option 1 | Compose v2 | `docker compose version` |
| [Python](https://www.python.org/downloads/) | Option 2, backend | 3.12 or newer | `python --version` (on Windows, `py --version`) |
| [Node.js](https://nodejs.org) with npm | Options 2 and 3, frontend | 20.19 or newer | `node --version` |

If a version is older than listed, install a newer one before continuing. Most setup problems start there.

## Get the code

```bash
git clone https://github.com/marinsnanadev/rerun.git
cd rerun
```

Every command below starts from this `rerun` folder unless it says otherwise.

## Option 1: run with Docker

The quickest way to see everything working. Nothing is installed on your machine besides Docker.

```bash
docker compose up --build
```

The first run downloads base images and builds both services, which can take a few minutes. When the log goes quiet, open **http://localhost:8080**.

- The web app is served by nginx, which forwards `/api` to the backend.
- Your data lives in a Docker volume named `rerun-data`, so it survives restarts.
- Press `Ctrl+C` to stop. To start again without rebuilding, run `docker compose up`.
- To delete all data as well, run `docker compose down -v`.

The build needs `frontend/package-lock.json` in the repository. If the build fails on `npm ci`, run `npm install` once inside `frontend/` to create it.

## Option 2: run it locally for development

This runs the API and the web app as two separate processes, so you need **two terminal windows**. Start the API first.

### Terminal 1: the API

```bash
cd backend
python -m venv .venv
```

Activate the virtual environment. The command depends on your system:

| System | Command |
| --- | --- |
| macOS and Linux | `source .venv/bin/activate` |
| Windows, PowerShell | `.venv\Scripts\Activate.ps1` |
| Windows, Command Prompt | `.venv\Scripts\activate.bat` |

Your prompt should now start with `(.venv)`. Then install and start the API:

```bash
pip install -e ".[dev]"
cp .env.example .env              # Windows: copy .env.example .env
uvicorn app.main:app --reload
```

Success looks like `Uvicorn running on http://127.0.0.1:8000`. Check it at **http://localhost:8000/api/health**, which should answer `{"status":"ok"}`. Interactive API docs are at http://localhost:8000/api/docs.

Leave this terminal running. The database file `backend/rerun.db` is created on first start.
If you already have a database, the API preserves its data and upgrades the show date column automatically.

Run `uvicorn` from inside the `backend` folder, because the settings file `.env` is read from the current folder.

### Terminal 2: the web app

Open a second terminal, go to the repository folder, then:

```bash
cd frontend
npm install
cp .env.example .env              # Windows: copy .env.example .env
npm run dev
```

Success looks like `Local: http://localhost:5173/`. Open **http://localhost:5173**.

The dev server forwards every `/api` request to the backend on port 8000, so the browser sees a single address and the session cookie works without any extra setup.

### Next time

You don't repeat the installation. In each terminal:

```bash
# Terminal 1
cd backend
source .venv/bin/activate         # Windows: see the table above
uvicorn app.main:app --reload

# Terminal 2
cd frontend
npm run dev
```

After pulling new changes, run `pip install -e ".[dev]"` and `npm install` again in case dependencies changed.

## Option 3: try the interface without a backend

Useful for looking at the UI alone. Only Node.js is needed.

```bash
cd frontend
npm install
cp .env.example .env              # Windows: copy .env.example .env
```

Open `frontend/.env`, change `VITE_API_MOCK=false` to `VITE_API_MOCK=true`, then:

```bash
npm run dev
```

Everything is stored in your browser's `localStorage`, and new accounts start with a few sample series. Mock passwords are stored as plain text, so don't use a real one. Clearing the site data for `localhost:5173` resets it.

Set it back to `false` and restart `npm run dev` to use the real backend again.

## Your first five minutes

1. Open the web app and choose **Create an account**.
2. Pick a username (3 to 32 letters, numbers, dots, dashes or underscores) and a password with at least 8 characters. You are signed in right away.
3. Choose **Add series**, fill in a title, genre and the date you finished it, and keep the list on **Add to looping**.
4. Add two or three more. The **Up next** card shows the one you've gone longest without.
5. Choose **Finished it** on that card. A new watch is logged and the series moves to the back of the rotation.
6. In the library, try **Edit** and **History** on a series.
7. Sign out and sign back in. Your series are still there.

With the real backend, a new account starts empty. Only the mock creates sample series.

## Ports and settings

| What | Address |
| --- | --- |
| Web app, Docker | http://localhost:8080 |
| Web app, development | http://localhost:5173 |
| Production preview (`npm run preview`) | http://localhost:4173 |
| API, local development | http://localhost:8000 |
| API docs | http://localhost:8000/api/docs |

All settings are optional.

**Backend, `backend/.env`** (details in [backend/README.md](backend/README.md)):

| Variable | Default | Purpose |
| --- | --- | --- |
| `RERUN_DATABASE_URL` | `sqlite:///./rerun.db` | Where data is stored |
| `RERUN_SESSION_COOKIE_NAME` | `rerun_session` | Name of the session cookie |
| `RERUN_SESSION_TTL_DAYS` | `30` | How long a sign-in lasts |
| `RERUN_COOKIE_SECURE` | `false` | Set to `true` when the site is served over HTTPS |

**Frontend, `frontend/.env`** (details in [frontend/README.md](frontend/README.md)):

| Variable | Default | Purpose |
| --- | --- | --- |
| `VITE_API_URL` | `/api` | Base URL of the API |
| `VITE_PROXY_TARGET` | `http://localhost:8000` | Where the dev server forwards `/api` |
| `VITE_API_MOCK` | `false` | `true` runs against an in-browser mock |

Restart the dev server after changing a `.env` file. Vite reads it only at startup.

## Tests and checks

Run them from the folder of each side. The backend commands need the virtual environment active.

```bash
# Backend
cd backend
pytest
ruff check .
mypy app

# Frontend
cd frontend
npm test
npm run lint
npm run typecheck
npm run build
```

GitHub Actions runs all of these, and builds both Docker images, on every push and pull request.

## Troubleshooting

**`python` is not found, or it is older than 3.12.** Install Python 3.12 or newer. On Windows try `py -3.12 -m venv .venv`. On macOS and Linux try `python3.12 -m venv .venv`.

**PowerShell says running scripts is disabled when activating the virtual environment.** Run `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` once, or use Command Prompt and `.venv\Scripts\activate.bat`.

**`pip install` fails or the packages are missing.** Make sure the prompt shows `(.venv)`. Without it, packages go to your global Python. Then run `pip install -e ".[dev]"` from inside `backend`.

**`uvicorn` is not found.** The virtual environment isn't active in this terminal. Activate it again.

**`Address already in use` or the port is taken.** Something else uses port 8000, 5173 or 8080. Close it, or start on another port: `uvicorn app.main:app --reload --port 8001` for the API, and then set `VITE_PROXY_TARGET=http://localhost:8001` in `frontend/.env` and restart `npm run dev`.

**The web app loads but sign-in and sign-up fail with a network error.** The API isn't running or isn't reachable. Open http://localhost:8000/api/health. If it doesn't answer, start Terminal 1 first.

**The sign-in page shows "Your session expired".** Your session ended, or the backend database was reset. Sign in again.

**Series are missing after a code update, or the API fails with a database error.** The database schema changed and there are no migrations yet. For development data you can discard, stop the API, delete `backend/rerun.db`, and start it again. Under Docker, run `docker compose down -v`. This erases all accounts and series.

**Port 5173 shows the old interface after switching `VITE_API_MOCK`.** Stop the dev server and run `npm run dev` again.

**`npm install` complains about the Node version.** The project needs Node.js 20.19 or newer. Check with `node --version`.

**`docker compose` is not found.** Install Docker Desktop, or on Linux the Compose plugin. The older `docker-compose` command also works with `docker-compose up --build`.

**The Docker build fails on `npm ci`.** `frontend/package-lock.json` is missing. Run `npm install` inside `frontend` once, and build again.

**Nothing appears at http://localhost:8080.** Wait for the log to show the frontend started, since it waits for the backend to be healthy. Check the state with `docker compose ps`, and the logs with `docker compose logs backend`.

## Repository layout

```
rerun/
├── frontend/            React + TypeScript single-page app (Vite)
├── backend/             FastAPI + SQLAlchemy API
├── docker-compose.yml   Runs both together
└── .github/workflows/   Continuous integration
```

See [frontend/README.md](frontend/README.md) and [backend/README.md](backend/README.md) for how each side is organized.
