# Looping TV

A tracker for people who rewatch the same handful of TV series on rotation.

Add the series you keep coming back to, log when you finished each one, and Looping TV tells you which one to watch next: the one you haven't seen for the longest time.

## How the rotation works

1. Add a series with its title, genre, the date you finished watching it and, optionally, the date you started.
2. Choose **Add to looping** to put it in your rotation.
3. Looping TV orders the rotation by last finished date, oldest first. The series at the top is what to watch next.
4. When you finish a series, log it with **Finished it**. It moves to the back of the line.

For example, if you finished Community on Sep 19, Modern Family on Aug 15 and The Office on Jul 10, The Office is up next because it has gone the longest without a rewatch.

Series can also be filed as **Would watch again**, **One time thing** or **Pondering**. These are for organization only and don't affect the rotation.

## Run it in your browser

You don't need a backend to try the app. In mock mode everything is stored in your browser.

### Requirements

- [Node.js](https://nodejs.org) 20.19 or newer (check with `node -v`)
- npm, which comes with Node.js

### Steps

1. Open a terminal in the project folder and go to the frontend:

   ```bash
   cd frontend
   ```

2. Install the dependencies:

   ```bash
   npm install
   ```

3. Create your environment file. The example already turns mock mode on.

   ```bash
   # macOS / Linux
   cp .env.example .env

   # Windows (Command Prompt)
   copy .env.example .env
   ```

4. Start the app:

   ```bash
   npm run dev
   ```

5. Open http://localhost:5173 in your browser.

6. Choose **Create an account**, pick a username and a password with at least 8 characters, and you're in. New accounts start with a few sample series so you can see the rotation right away.

To stop the app, press `Ctrl + C` in the terminal.

### Good to know

- In mock mode, accounts and series live in your browser's `localStorage`. They stay on that browser and device, and they are cleared if you clear the site's data.
- To start over, open your browser's developer tools, go to **Application** (or **Storage**), and clear the data for `localhost:5173`.
- Mock passwords are stored as plain text. This is for local development only, so don't reuse a real password.

### Build for production

```bash
npm run build     # typechecks, then writes the site to frontend/dist
npm run preview   # serves the build at http://localhost:4173
```

## Repository layout

```
looping-tv/
├── frontend/   React + TypeScript single-page app (Vite)
└── backend/    API (coming next)
```

See [frontend/README.md](frontend/README.md) for environment variables, scripts and how the source is organized.