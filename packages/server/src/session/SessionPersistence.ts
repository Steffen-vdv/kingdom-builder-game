import type { Database } from '../database/Database.js';
import type {
	SessionSnapshot,
	SessionRegistriesPayload,
	SessionPlayerId,
	ActionParametersPayload,
	GameConfig,
} from '@kingdom-builder/protocol';
import type { SessionStaticMetadataPayload } from './buildSessionMetadata.js';

/**
 * Action log entry for replaying game state.
 * Captures all operations that modify game state.
 */
export type ActionLogEntry =
	| {
			type: 'action';
			actionId: string;
			params?: ActionParametersPayload;
	  }
	| {
			type: 'advance';
	  }
	| {
			type: 'player-name';
			playerId: SessionPlayerId;
			name: string;
	  }
	| {
			type: 'dev-mode';
			enabled: boolean;
	  };

/**
 * Options used when creating a session, needed for replay.
 */
export interface SessionCreationOptions {
	/** Content package identifier used for this session */
	contentId?: string;
	devMode?: boolean;
	config?: GameConfig;
	playerNames?: Partial<Record<SessionPlayerId, string>>;
}

/**
 * Complete persisted session data needed to restore a session.
 */
export interface PersistedSessionData {
	sessionId: string;
	creationOptions: SessionCreationOptions;
	actionLog: ActionLogEntry[];
	lastSnapshot: SessionSnapshot;
	registries: SessionRegistriesPayload;
	metadata: SessionStaticMetadataPayload;
	lastAccessedAt: number;
	createdAt: number;
}

/**
 * Database row structure for session_snapshots table.
 */
interface SessionSnapshotRow {
	session_id: string;
	creation_options: string;
	action_log: string;
	last_snapshot: string;
	registries: string;
	metadata: string;
	last_accessed_at: number;
	created_at: number;
}

const RETENTION_PERIOD_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Handles persistence of session state to SQLite database.
 * Enables session recovery after timeout or server restart.
 */
export class SessionPersistence {
	private readonly database: Database;
	private readonly now: () => number;

	public constructor(database: Database, options: { now?: () => number } = {}) {
		this.database = database;
		this.now = options.now ?? Date.now;
	}

	/**
	 * Saves or updates a session in the database.
	 */
	public save(data: PersistedSessionData): void {
		const db = this.database.getConnection();
		const stmt = db.prepare<
			[string, string, string, string, string, string, number, number]
		>(`
			INSERT INTO session_snapshots (
				session_id,
				creation_options,
				action_log,
				last_snapshot,
				registries,
				metadata,
				last_accessed_at,
				created_at
			) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
			ON CONFLICT(session_id) DO UPDATE SET
				action_log = excluded.action_log,
				last_snapshot = excluded.last_snapshot,
				registries = excluded.registries,
				metadata = excluded.metadata,
				last_accessed_at = excluded.last_accessed_at
		`);
		stmt.run(
			data.sessionId,
			JSON.stringify(data.creationOptions),
			JSON.stringify(data.actionLog),
			JSON.stringify(data.lastSnapshot),
			JSON.stringify(data.registries),
			JSON.stringify(data.metadata),
			data.lastAccessedAt,
			data.createdAt,
		);
	}

	/**
	 * Loads a session from the database.
	 * Returns undefined if the session doesn't exist or has expired.
	 */
	public load(sessionId: string): PersistedSessionData | undefined {
		const db = this.database.getConnection();
		const stmt = db.prepare<[string], SessionSnapshotRow>(
			'SELECT * FROM session_snapshots WHERE session_id = ?',
		);
		const row = stmt.get(sessionId);
		if (!row) {
			return undefined;
		}
		// Check if session has expired (24h retention)
		const expirationTime = this.now() - RETENTION_PERIOD_MS;
		if (row.last_accessed_at < expirationTime) {
			// Session expired, delete it
			this.delete(sessionId);
			return undefined;
		}
		return this.rowToData(row);
	}

	/**
	 * Updates the last_accessed_at timestamp for a session.
	 */
	public touch(sessionId: string): void {
		const db = this.database.getConnection();
		const stmt = db.prepare<[number, string]>(
			'UPDATE session_snapshots SET last_accessed_at = ? WHERE session_id = ?',
		);
		stmt.run(this.now(), sessionId);
	}

	/**
	 * Appends an action to the session's action log and updates snapshot.
	 */
	public appendAction(
		sessionId: string,
		action: ActionLogEntry,
		snapshot: SessionSnapshot,
		registries: SessionRegistriesPayload,
		metadata: SessionStaticMetadataPayload,
	): void {
		const db = this.database.getConnection();
		const now = this.now();
		// Use JSON functions to append to array efficiently
		const stmt = db.prepare<[string, string, string, string, number, string]>(`
			UPDATE session_snapshots SET
				action_log = json_insert(action_log, '$[#]', json(?)),
				last_snapshot = ?,
				registries = ?,
				metadata = ?,
				last_accessed_at = ?
			WHERE session_id = ?
		`);
		stmt.run(
			JSON.stringify(action),
			JSON.stringify(snapshot),
			JSON.stringify(registries),
			JSON.stringify(metadata),
			now,
			sessionId,
		);
	}

	/**
	 * Deletes a session from the database.
	 */
	public delete(sessionId: string): boolean {
		const db = this.database.getConnection();
		const stmt = db.prepare<[string]>(
			'DELETE FROM session_snapshots WHERE session_id = ?',
		);
		const result = stmt.run(sessionId);
		return result.changes > 0;
	}

	/**
	 * Deletes all sessions older than the retention period (24h).
	 * Returns the number of sessions deleted.
	 */
	public purgeExpired(): number {
		const db = this.database.getConnection();
		const expirationTime = this.now() - RETENTION_PERIOD_MS;
		const stmt = db.prepare<[number]>(
			'DELETE FROM session_snapshots WHERE last_accessed_at < ?',
		);
		const result = stmt.run(expirationTime);
		return result.changes;
	}

	/**
	 * Checks if a session exists in the database (and is not expired).
	 */
	public exists(sessionId: string): boolean {
		const db = this.database.getConnection();
		const expirationTime = this.now() - RETENTION_PERIOD_MS;
		const stmt = db.prepare<[string, number], { count: number }>(
			`SELECT COUNT(*) as count FROM session_snapshots
			 WHERE session_id = ? AND last_accessed_at >= ?`,
		);
		const result = stmt.get(sessionId, expirationTime);
		return (result?.count ?? 0) > 0;
	}

	/**
	 * Gets the count of persisted sessions (non-expired).
	 */
	public getCount(): number {
		const db = this.database.getConnection();
		const expirationTime = this.now() - RETENTION_PERIOD_MS;
		const stmt = db.prepare<[number], { count: number }>(
			'SELECT COUNT(*) as count FROM session_snapshots WHERE last_accessed_at >= ?',
		);
		const result = stmt.get(expirationTime);
		return result?.count ?? 0;
	}

	private rowToData(row: SessionSnapshotRow): PersistedSessionData {
		return {
			sessionId: row.session_id,
			creationOptions: JSON.parse(
				row.creation_options,
			) as SessionCreationOptions,
			actionLog: JSON.parse(row.action_log) as ActionLogEntry[],
			lastSnapshot: JSON.parse(row.last_snapshot) as SessionSnapshot,
			registries: JSON.parse(row.registries) as SessionRegistriesPayload,
			metadata: JSON.parse(row.metadata) as SessionStaticMetadataPayload,
			lastAccessedAt: row.last_accessed_at,
			createdAt: row.created_at,
		};
	}
}
