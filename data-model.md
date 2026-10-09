# QuickNotes Data Model

## Entities

### users
| Column | Type | Key / constraint |
|--------|------|------------------|
| id | BIGINT (auto-increment) | **Primary key** |
| email | VARCHAR(255) | UNIQUE, NOT NULL |
| password_hash | VARCHAR(255) | NOT NULL |
| created_at | TIMESTAMP | NOT NULL, default now |

### notes
| Column | Type | Key / constraint |
|--------|------|------------------|
| id | BIGINT (auto-increment) | **Primary key** |
| user_id | BIGINT | **Foreign key** -> users(id), NOT NULL |
| title | VARCHAR(100) | NOT NULL |
| body | TEXT | nullable |
| created_at | TIMESTAMP | NOT NULL, default now |
| updated_at | TIMESTAMP | NOT NULL, default now |

### tags
| Column | Type | Key / constraint |
|--------|------|------------------|
| id | BIGINT (auto-increment) | **Primary key** |
| user_id | BIGINT | **Foreign key** -> users(id), NOT NULL |
| name | VARCHAR(50) | NOT NULL, UNIQUE per user |

### note_tags (join table)
| Column | Type | Key / constraint |
|--------|------|------------------|
| note_id | BIGINT | **Foreign key** -> notes(id), part of composite primary key |
| tag_id | BIGINT | **Foreign key** -> tags(id), part of composite primary key |

Primary key of `note_tags` is `(note_id, tag_id)`.

## Relationships

- **One-to-many: users -> notes.** One user owns many notes; each note has exactly one owner (`notes.user_id`).
- **One-to-many: users -> tags.** One user creates many tags; each tag belongs to one user.
- **Many-to-many: notes <-> tags.** A note can have many tags and a tag can be on many notes. A relational database cannot store this directly, so the join table `note_tags` holds one row per (note, tag) pair.

## CREATE TABLE statements (PostgreSQL)

```sql
CREATE TABLE users (
  id            BIGSERIAL PRIMARY KEY,
  email         VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  created_at    TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE notes (
  id         BIGSERIAL PRIMARY KEY,
  user_id    BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title      VARCHAR(100) NOT NULL,
  body       TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT now(),
  updated_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE tags (
  id      BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name    VARCHAR(50) NOT NULL,
  UNIQUE (user_id, name)
);

CREATE TABLE note_tags (
  note_id BIGINT NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
  tag_id  BIGINT NOT NULL REFERENCES tags(id)  ON DELETE CASCADE,
  PRIMARY KEY (note_id, tag_id)
);

CREATE INDEX idx_notes_user_created ON notes (user_id, created_at DESC);
CREATE INDEX idx_note_tags_tag ON note_tags (tag_id);
```

## Example queries

**1. Latest 10 notes of one user (uses the index below):**

```sql
SELECT id, title, body, created_at
FROM notes
WHERE user_id = 17
ORDER BY created_at DESC
LIMIT 10;
```

**2. All notes with their tags (JOIN across the many-to-many relation):**

```sql
SELECT n.id, n.title, t.name AS tag
FROM notes n
JOIN note_tags nt ON nt.note_id = n.id
JOIN tags t       ON t.id = nt.tag_id
WHERE n.user_id = 17
ORDER BY n.created_at DESC;
```

**3. How many notes each user has (aggregate):**

```sql
SELECT u.email, COUNT(n.id) AS note_count
FROM users u
LEFT JOIN notes n ON n.user_id = u.id
GROUP BY u.email
ORDER BY note_count DESC;
```

**4. Create a note (write):**

```sql
INSERT INTO notes (user_id, title, body) VALUES (17, 'Buy groceries', 'Milk, eggs, bread');
```

## Indexes

- `idx_notes_user_created ON notes (user_id, created_at DESC)`: the most common query is "show this user's newest notes". Without the index the database scans every note of all users; with it, it jumps straight to the user's rows already sorted by date, so `GET /notes` stays fast with hundreds of millions of rows.
- `idx_note_tags_tag ON note_tags (tag_id)`: speeds up "find all notes with this tag". (The primary key already covers lookups by `note_id`.)
- Indexes make reads faster but slow writes slightly and use disk, so only the two query patterns that matter are indexed.

## SQL vs NoSQL

I chose **SQL (PostgreSQL)**. QuickNotes data is clearly relational (users own notes, notes share tags), and the many-to-many tag relation needs JOINs and foreign keys that keep data consistent (no note without an owner, no orphan tag links). Transactions give safe writes, and the data fits comfortably on one primary with read replicas at this scale (around 200 GB per year). A NoSQL store such as DynamoDB would scale writes horizontally more easily but makes tag queries and consistency harder; if QuickNotes grows far beyond 1 million users, notes could later be sharded by `user_id` or moved to a document store while users and billing stay in SQL.
