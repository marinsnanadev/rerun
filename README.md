# Rerun

A tracker for people who rewatch the same handful of TV series on rotation.

Add the series you keep coming back to, log when you finished each one, and Rerun tells you which one to watch next: the one you haven't seen for the longest time.

## How the rotation works

1. Add a series with its genre, the date you finished watching it and, optionally, the date you started.
2. Mark it as **Add to looping** to put it in your rotation.
3. Rerun orders the rotation by last finished date, oldest first. The top of the list is what to watch next.
4. When you finish a series, log it. It moves to the back of the line.

Series can also be filed as **Would watch again**, **One time thing** or **Pondering**. These are for organization only and don't affect the rotation.

## Repository layout

```
rerun/
├── frontend/   React + TypeScript single-page app (Vite)
└── backend/    API (coming next)
```

## Getting started

Each part has its own README with setup instructions. To try the interface without a backend, run the frontend in mock mode (see `frontend/README.md`).
