# QuickNotes API Design

This is the real REST API the backend team should build (not JSONPlaceholder).

- Base URL: `https://api.quicknotes.example/v1`
- Format: JSON (`Content-Type: application/json`)
- Auth: `Authorization: Bearer <token>` on every endpoint except register and login
- Notes belong to the logged-in user; a user can never read or change another user's notes.

## Endpoints

| # | Method | Path | Description | Success status |
|---|--------|------|-------------|----------------|
| 1 | POST | `/auth/register` | Create a user account | 201 Created |
| 2 | POST | `/auth/login` | Exchange email + password for a token | 200 OK |
| 3 | GET | `/notes` | List my notes (supports `?page=`, `?limit=`, `?tag=`) | 200 OK |
| 4 | POST | `/notes` | Create a note | 201 Created |
| 5 | GET | `/notes/{id}` | Get one note | 200 OK |
| 6 | PUT | `/notes/{id}` | Replace a note's title/body/tags | 200 OK |
| 7 | PATCH | `/notes/{id}` | Partially update a note | 200 OK |
| 8 | DELETE | `/notes/{id}` | Delete a note | 204 No Content |
| 9 | GET | `/tags` | List my tags | 200 OK |
| 10 | POST | `/notes/{id}/tags` | Attach a tag to a note | 201 Created |
| 11 | DELETE | `/notes/{id}/tags/{tagId}` | Remove a tag from a note | 204 No Content |

Design choices: nouns for resources, HTTP verbs for actions, plural names, versioned path (`/v1`), and pagination on the list endpoint so a response never grows without limit.

## Example: create a note

`POST /notes`

Request:

```json
{
  "title": "Buy groceries",
  "body": "Milk, eggs, bread",
  "tags": ["personal", "shopping"]
}
```

Response: `201 Created`, with a `Location: /v1/notes/4821` header.

```json
{
  "id": 4821,
  "userId": 17,
  "title": "Buy groceries",
  "body": "Milk, eggs, bread",
  "tags": ["personal", "shopping"],
  "createdAt": "2026-10-09T08:15:30Z",
  "updatedAt": "2026-10-09T08:15:30Z"
}
```

## Example: list notes

`GET /notes?page=1&limit=2`

Response: `200 OK`

```json
{
  "data": [
    {
      "id": 4821,
      "title": "Buy groceries",
      "body": "Milk, eggs, bread",
      "tags": ["personal", "shopping"],
      "createdAt": "2026-10-09T08:15:30Z",
      "updatedAt": "2026-10-09T08:15:30Z"
    },
    {
      "id": 4790,
      "title": "Sprint planning",
      "body": "Agenda for Monday",
      "tags": ["work"],
      "createdAt": "2026-10-08T14:02:11Z",
      "updatedAt": "2026-10-08T14:02:11Z"
    }
  ],
  "page": 1,
  "limit": 2,
  "total": 57
}
```

## Error codes

| Status | Meaning | When it happens |
|--------|---------|-----------------|
| 400 Bad Request | Invalid input | Missing title, title over 100 characters, malformed JSON |
| 401 Unauthorized | Not authenticated | Missing, expired or invalid token |
| 403 Forbidden | Authenticated but not allowed | Trying to read or edit another user's note |
| 404 Not Found | Resource does not exist | Unknown note id or path |
| 409 Conflict | Duplicate | Registering an email that already exists |
| 429 Too Many Requests | Rate limit hit | Too many requests in a short time |
| 500 Internal Server Error | Server bug or outage | Unexpected failure; the client may retry later |

Every error uses the same body shape:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Title is required and must be 100 characters or fewer.",
    "status": 400,
    "details": [{ "field": "title", "issue": "required" }]
  }
}
```

Example 404 body:

```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "Note 9999 does not exist.",
    "status": 404
  }
}
```
