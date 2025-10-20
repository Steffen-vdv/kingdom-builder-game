# Working with Persistent Session Data

Server sessions can now be backed by a persistence layer so that active games survive
process restarts. This guide outlines how the `SessionStore` abstraction works,
when to use the bundled SQLite implementation, and the practices that keep data
consistent.

## SessionStore overview

- `SessionStore` lives at `packages/server/src/session/SessionStore.ts` and
  serializes `SessionRecord` data (timestamps, metadata, registry JSON,
  optional game configuration, and the dev-mode flag).
- Stores **must** be synchronous: `SessionManager` hydrates itself inside its
  constructor and cannot `await` asynchronous calls.
- Implementations should clone or deep-copy inputs before writing them so that
  downstream code cannot mutate the persisted state.
- Call `close()` on custom stores if they hold file handles or sockets.

## Using the SQLite implementation

`SQLiteSessionStore` (`packages/server/src/session/sqlite/SQLiteSessionStore.ts`)
wraps [`better-sqlite3`](https://github.com/WiseLibs/better-sqlite3) and writes
session payloads to a single table (default name `sessions`). JSON payloads for
registries, metadata, and game configuration are stored in TEXT columns.

```ts
import { SQLiteSessionStore } from './session/sqlite/SQLiteSessionStore.js';

const store = new SQLiteSessionStore({
	filePath: './data/sessions.db',
	// tableName: 'custom_sessions', // optional override
});
```

### Bootstrapping SessionManager with persistence

```ts
import { SessionManager } from './session/SessionManager.js';
import { SQLiteSessionStore } from './session/sqlite/SQLiteSessionStore.js';

const store = new SQLiteSessionStore({ filePath: './data/sessions.db' });
const manager = new SessionManager({ store });
```

- The manager hydrates itself immediately by reading every record from the
  store. Hydration creates fresh engine sessions and reattaches metadata and
  registries from disk.
- `createSession`, `getSession`, idle purges, and manual destruction all update
  the store automatically.
- Always close the store (call `store.close()`) before deleting the database
  file or replacing it during tests.

### Operational tips

- Prefer storing database files alongside other server runtime artefacts (e.g.,
  `./data`). The constructor will create the parent directory when needed.
- The default schema uses WAL journaling via `better-sqlite3`, so running the
  server in multiple processes is not supported.
- When debugging, inspect the `sessions` table directly:

  ```bash
  sqlite3 data/sessions.db "SELECT session_id, dev_mode, created_at, last_accessed_at FROM sessions;"
  ```

  JSON columns can be expanded with `json_each` or exported to a file for
  inspection.

## Writing alternative stores

- Conform to the same semantics as `SQLiteSessionStore`: return every persisted
  record during `loadAll()` and implement idempotent `save()` operations so that
  repeated updates only replace existing rows/documents.
- Ensure `delete()` removes data even if called multiple times; the manager
  invokes it for manual deletions and idle purges.
- Run the persistence tests under `packages/server/tests/SessionManager.persistence.test.ts`
  to confirm new stores behave correctly.
