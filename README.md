# QuickNotes System Design

QuickNotes is moving from a browser-only app to an online service for 1 million users. This repository has two parts:

1. **An API client** (HTML, CSS, JavaScript) that proves the front end can talk to a REST API. It uses the JSONPlaceholder practice API to load, create and delete notes.
2. **Design documents** the backend team will build from: the API, the database, and the system architecture.

## How to run the API client

No build step or install is needed.

1. Clone the repo: `git clone https://github.com/your-username/quicknotes-system-design.git`
2. Open `index.html` in a browser (double-click it), or serve the folder with `python3 -m http.server` and visit `http://localhost:8000`.
3. Click **Load notes** to fetch 10 notes (GET).
4. Fill in the form and click **Save note** to create a note (POST). The title is required, up to 100 characters.
5. Click **Delete** on any note to remove it (DELETE).

You need an internet connection because the client calls `https://jsonplaceholder.typicode.com/posts`. JSONPlaceholder does not store changes, so created notes disappear when you reload (see the comment above `deleteNote` in `api.js`).

## Documents

- [API design](docs/api-design.md): endpoints, request/response examples, error codes
- [Data model](docs/data-model.md): tables, relationships, SQL, indexes, SQL vs NoSQL
- [Architecture](docs/architecture.md): requirements, load estimate, diagram, request flows, trade-offs

## What I learned

- **One reusable `request()` function keeps error handling consistent.** Checking `response.ok` in one place means every GET, POST and DELETE fails the same way, because `fetch` does not throw on 404 or 500 by itself.
- **Every request has four states: loading, success, error and empty.** Using `try / catch / finally` and disabling buttons while a request runs prevents double submits and leaves the UI in a clear state.
- **Never trust user text.** Using `textContent` instead of `innerHTML` stops injected HTML or scripts, and validating on the client gives instant feedback (the server must still validate too).
- **Back-of-the-envelope estimates guide design.** 1 million users is only about 350 reads and 70 writes per second at peak, so caching and a read replica matter more than sharding.
- **Every design choice is a trade-off.** Caches and replicas add speed but allow stale reads; queues add resilience but also complexity; designing for no single point of failure means running two or more of everything.
