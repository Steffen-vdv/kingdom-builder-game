-- Stores session snapshots for recovery after server restart or session timeout.
-- Sessions can be restored from this data within the retention period.
-- The action_log enables replaying game state to restore an EngineSession.

CREATE TABLE session_snapshots (
	-- Unique session identifier (UUID)
	session_id TEXT PRIMARY KEY NOT NULL,
	-- Creation options (JSON) - devMode, config, playerNames
	creation_options TEXT NOT NULL,
	-- Action log (JSON array) - sequence of actions/advances for replay
	-- Each entry: {type: 'action'|'advance', actionId?, params?, playerId?}
	action_log TEXT NOT NULL DEFAULT '[]',
	-- Last snapshot (JSON) - cached for quick client state retrieval
	last_snapshot TEXT NOT NULL,
	-- Session registries (JSON) - action/building/development registries
	registries TEXT NOT NULL,
	-- Session metadata (JSON) - static metadata for the session
	metadata TEXT NOT NULL,
	-- Unix timestamp of last access (for 24h cleanup)
	last_accessed_at INTEGER NOT NULL,
	-- Unix timestamp of creation
	created_at INTEGER NOT NULL
);

-- Index for efficient cleanup queries (find sessions older than 24h)
CREATE INDEX idx_session_snapshots_last_accessed
	ON session_snapshots(last_accessed_at);
