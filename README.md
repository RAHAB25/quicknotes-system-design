# QuickNotes

QuickNotes is a small browser client for practicing REST API calls and a set of backend design documents for a proposed note-taking service intended to scale to one million registered users.

## Features

- Load 10 sample posts using `GET /posts?_limit=10`.
- Create a note with `POST /posts`, including title validation and status feedback.
- Delete a note with `DELETE /posts/{id}`.
- Loading, success, error and empty states; request buttons are disabled while their requests run.
- API contract, relational data model and scalable architecture documentation.

## Run the API client

1. Clone or download this repository.
2. Open `index.html` in a modern browser, or serve the directory locally (recommended):

   ```bash
   python3 -m http.server 8000
   ```

3. Visit `http://localhost:8000` and select **Load notes**.
4. Create and delete notes to observe the request/status behaviour. Internet access is required to reach JSONPlaceholder.

This is a front-end demo, not the production QuickNotes backend. It uses `https://jsonplaceholder.typicode.com/posts`; that service simulates POST and DELETE rather than persisting those changes. The client updates the current page locally after a successful response.

## Design documents

- [REST API design](docs/api-design.md)
- [Data model](docs/data-model.md)
- [Architecture and capacity estimate](docs/architecture.md)

## What I learned

- How to make asynchronous GET, POST and DELETE requests with `fetch`, check HTTP status codes and handle errors with `try`/`catch`/`finally`.
- Why input validation and DOM `textContent` are important for safer, more predictable UI behaviour.
- How REST endpoints, HTTP status codes and JSON contracts help frontend and backend teams work independently.
- How relational keys, join tables and indexes support ownership, many-to-many tagging and common query patterns.
- How caching, read replicas, queues, redundancy and explicit capacity assumptions shape a scalable service.

## Git history

The project is organized into seven focused commits corresponding to the assignment tasks: API client GET, POST, DELETE, API design, data model, architecture, and README/submission. Review the commit log with `git log --oneline`.
