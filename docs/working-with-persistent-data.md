# Working with Persistent Data

This server exposes an opt-in persistence layer for session metadata and
registries. A `SessionStore` implementation can capture the lightweight session
records created by `SessionManager` and restore them when the server process
restarts.

## Core concepts

- `SessionStore` is a synchronous interface with `loadAll`, `save`, and
  `delete`. Implementations should treat the payload as immutable and clone
  incoming data before writing it to disk.
- `SessionManager` accepts an optional `store` in its constructor. When
  provided, the manager eagerly hydrates previously saved sessions, keeps the
  `lastAccessedAt` timestamp up to date, and deletes expired entries from the
  store whenever the in-memory cache purges.
- Persisted records contain serialized registries and metadata for the session
  along with the last known config and dev-mode flag. Engine sessions are
  recreated lazily using the manager's base options and the stored dev-mode
  setting.

## SQLite implementation

The default store is `SQLiteSessionStore`, powered by `better-sqlite3`. It
creates a `sessions` table with JSON payload columns and runs in WAL mode for
fast local writes. Each call to `save` performs an UPSERT, so successive
updates for the same session id will replace the previous snapshot.

When using the SQLite store:

- Call `close()` during shutdown to release file handles.
- Place databases on local disk (for example, under a workspace data directory)
  and ensure the process has permission to create the file.
- Prefer temporary files in tests via `mkdtempSync` to avoid leaking state.

## Testing guidance

- Persistence tests should interact with a temporary SQLite file, close the
  first store, and then reinstantiate a new `SessionManager` with the same
  engine options and the reopened store.
- Verify that metadata and registries match before and after hydration, and
  confirm that dev-mode flags survive the round trip.
- Keep idle timeout values generous when testing persistence to avoid accidental
  purges during hydration.

## Manual verification

To inspect persisted sessions on a running development server, you can open a
REPL or dev shell on the host machine and run:

```bash
node - <<'NODE'
const Database = require('better-sqlite3');
const db = new Database('path/to/sessions.db');
const query = `
	SELECT session_id, created_at, last_accessed_at, dev_mode
	FROM sessions
`;
console.table(db.prepare(query).all());
db.close();
NODE
```

This query lists the known session identifiers, creation timestamps, last access
values, and dev-mode flags. Repeating the command before and after restarting
`SessionManager` should confirm that the data survives process restarts.
