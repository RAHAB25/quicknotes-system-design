# QuickNotes Data Model

## Entities and relationships

- **users**: one row per account. A user has many notes and many tags.
- **notes**: each note belongs to exactly one user (`notes.user_id → users.id`); this is a one-to-many relationship from users to notes.
- **tags**: a tag belongs to a user so tag names and labels can be managed privately per account.
- **note_tags**: join table linking notes and tags. A note can have many tags and a tag can be applied to many notes, so notes-to-tags is many-to-many. Composite primary key prevents duplicate links. Composite foreign keys enforce that a note and tag in a link belong to the same user.

The examples use PostgreSQL. `BIGINT GENERATED ALWAYS AS IDENTITY` is used for compact internal keys; public APIs may expose opaque IDs instead.

## CREATE TABLE statements

```sql
CREATE TABLE users (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  email VARCHAR(254) NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  display_name VARCHAR(100) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT users_id_unique UNIQUE (id)
);

CREATE TABLE notes (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(100) NOT NULL,
  body TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- Supports ownership-safe composite FK from note_tags.
  CONSTRAINT notes_user_id_id_unique UNIQUE (user_id, id)
);

CREATE TABLE tags (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(50) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT tags_user_name_unique UNIQUE (user_id, name),
  CONSTRAINT tags_user_id_id_unique UNIQUE (user_id, id)
);

CREATE TABLE note_tags (
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  note_id BIGINT NOT NULL,
  tag_id BIGINT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (note_id, tag_id),
  CONSTRAINT note_tags_note_owner_fk
    FOREIGN KEY (user_id, note_id) REFERENCES notes(user_id, id) ON DELETE CASCADE,
  CONSTRAINT note_tags_tag_owner_fk
    FOREIGN KEY (user_id, tag_id) REFERENCES tags(user_id, id) ON DELETE CASCADE
);
```

## Example SQL queries

List a user's newest notes (keyset pagination is preferable to large OFFSETs):

```sql
SELECT id, title, body, created_at, updated_at
FROM notes
WHERE user_id = $1
ORDER BY created_at DESC, id DESC
LIMIT 20;
```

Fetch a note and its tags using a JOIN:

```sql
SELECT n.id, n.title, n.body, t.id AS tag_id, t.name AS tag_name
FROM notes AS n
LEFT JOIN note_tags AS nt ON nt.note_id = n.id AND nt.user_id = n.user_id
LEFT JOIN tags AS t ON t.id = nt.tag_id AND t.user_id = nt.user_id
WHERE n.user_id = $1 AND n.id = $2;
```

Create a note safely for the authenticated user:

```sql
INSERT INTO notes (user_id, title, body)
VALUES ($1, $2, COALESCE($3, ''))
RETURNING id, user_id, title, body, created_at, updated_at;
```

Count notes per user for usage reporting:

```sql
SELECT u.id, u.email, COUNT(n.id) AS note_count
FROM users AS u
LEFT JOIN notes AS n ON n.user_id = u.id
GROUP BY u.id, u.email
ORDER BY note_count DESC;
```

## Indexes

```sql
CREATE INDEX notes_user_created_idx ON notes (user_id, created_at DESC, id DESC);
CREATE INDEX note_tags_tag_idx ON note_tags (user_id, tag_id, note_id);
```

`notes_user_created_idx` supports the most common operation—listing one user's notes in newest-first order—without scanning all users' notes. The primary key on `note_tags(note_id, tag_id)` already supports lookups by note; the second index makes tag-to-notes lookups efficient.

## SQL or NoSQL?

Use a relational SQL database (PostgreSQL) for the initial service. Notes have clear ownership and tags require many-to-many relationships, while foreign keys, transactions, uniqueness constraints and mature indexing help preserve data integrity. PostgreSQL can scale reads with replicas and scale vertically before more complex sharding is needed. A document store could simplify flexible note payloads, but it would make relational tag queries and cross-entity integrity more application-dependent without a clear early benefit.
