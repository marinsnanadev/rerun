# Rerun frontend

React 19, TypeScript (strict) and Vite.

## Setup

```bash
npm install
cp .env.example .env
npm run dev
```

The app runs at http://localhost:5173.

## Environment

| Variable        | Default | Purpose                                                              |
| --------------- | ------- | -------------------------------------------------------------------- |
| `VITE_API_URL`  | `/api`  | Base URL of the backend. In development, Vite proxies `/api` to it.  |
| `VITE_API_MOCK` | unset   | Set to `true` to run against a local in-browser mock (no backend).   |
| `VITE_PROXY_TARGET` | `http://localhost:8000` | Where the dev server forwards `/api` requests.       |

## Scripts

| Command             | What it does                      |
| ------------------- | --------------------------------- |
| `npm run dev`       | Start the dev server              |
| `npm run build`     | Typecheck, then build for release |
| `npm run typecheck` | Typecheck only                    |
| `npm run lint`      | Lint the source                   |
| `npm test`          | Run unit tests once               |
| `npm run test:watch`| Run unit tests in watch mode      |

## Source layout

```
src/
├── api/        HTTP client, mock client and shared API types
├── components/ Small presentational building blocks
├── domain/     Pure business logic: types, rotation queue, validation
├── features/   Screens and the components specific to them
├── lib/        Framework-independent helpers (dates)
└── styles/     Design tokens and global styles
```

Business rules live in `src/domain` and have no React or browser dependencies, so they are covered by fast unit tests.
