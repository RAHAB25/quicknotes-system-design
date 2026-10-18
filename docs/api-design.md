# QuickNotes REST API Design

Base URL: `https://api.quicknotes.example/v1` (illustrative; replace with the deployed API host). All payloads use JSON and authenticated endpoints require `Authorization: Bearer <access-token>`. IDs are opaque strings in the production API.

## Endpoints

| Method | Path | Description | Success status |
|---|---|---|---|
| POST | `/auth/register` | Create an account | `201 Created` |
| POST | `/auth/login` | Authenticate and issue access/refresh tokens | `200 OK` |
| GET | `/notes` | List the current user's notes; supports `?limit=20&cursor=...` | `200 OK` |
| POST | `/notes` | Create a note owned by the current user | `201 Created` |
| GET | `/notes/{noteId}` | Retrieve one note owned by the current user | `200 OK` |
| PATCH | `/notes/{noteId}` | Partially update a note | `200 OK` |
| DELETE | `/notes/{noteId}` | Delete a note | `204 No Content` |
| GET | `/tags` | List tags for the current user | `200 OK` |
| PUT | `/notes/{noteId}/tags/{tagId}` | Attach an existing tag to a note (idempotent) | `204 No Content` |

List responses are paginated. The API must not reveal whether another user's private note exists; an inaccessible note can return `404 Not Found`. Timestamps are UTC ISO-8601 strings. Server-side validation is authoritative even if the browser validates too.

## Create a note

Request: `POST /v1/notes`

```json
{
  "title": "Project ideas",
  "body": "Sketch the first release plan.",
  "tagIds": ["tag_abc"]
}
```

Response (`201 Created`):

```json
{
  "data": {
    "id": "note_123",
    "userId": "user_42",
    "title": "Project ideas",
    "body": "Sketch the first release plan.",
    "tags": [{"id": "tag_abc", "name": "work"}],
    "createdAt": "2026-10-18T12:30:00Z",
    "updatedAt": "2026-10-18T12:30:00Z"
  }
}
```

The server derives `userId` from the authenticated identity, not from a client-supplied owner field.

## List notes

Request: `GET /v1/notes?limit=20&cursor=eyJpZCI6...`

Response (`200 OK`):

```json
{
  "data": [
    {
      "id": "note_123",
      "userId": "user_42",
      "title": "Project ideas",
      "body": "Sketch the first release plan.",
      "tags": [{"id": "tag_abc", "name": "work"}],
      "createdAt": "2026-10-18T12:30:00Z",
      "updatedAt": "2026-10-18T12:30:00Z"
    }
  ],
  "page": {"limit": 20, "nextCursor": null, "hasMore": false}
}
```

## Error contract

Errors use a consistent JSON envelope and a suitable HTTP status:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Title is required.",
    "details": [{"field": "title", "issue": "required"}],
    "requestId": "req_7f91c2"
  }
}
```

| Status | Meaning | Example code |
|---|---|---|
| `400 Bad Request` | Malformed JSON or invalid parameters | `VALIDATION_ERROR` |
| `401 Unauthorized` | Missing, expired or invalid credentials | `UNAUTHENTICATED` |
| `403 Forbidden` | Authenticated user lacks permission | `FORBIDDEN` |
| `404 Not Found` | Resource does not exist or is not visible to caller | `NOT_FOUND` |
| `409 Conflict` | State conflict, such as duplicate unique tag name | `CONFLICT` |
| `413 Payload Too Large` | Request exceeds configured body limit | `PAYLOAD_TOO_LARGE` |
| `429 Too Many Requests` | Rate limit exceeded; include `Retry-After` where possible | `RATE_LIMITED` |
| `500 Internal Server Error` | Unexpected server failure | `INTERNAL_ERROR` |
| `503 Service Unavailable` | Service temporarily unable to serve requests | `UNAVAILABLE` |

Never return stack traces, SQL text, tokens, or other secrets in error responses. Log the request ID and diagnostic details server-side.
