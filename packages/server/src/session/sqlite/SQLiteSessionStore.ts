import Database from 'better-sqlite3';
import type {
	Database as BetterSqliteDatabase,
	Statement,
} from 'better-sqlite3';
import type { SessionRecord, SessionStore } from '../SessionStore.js';

type SessionRow = {
	session_id: string;
	created_at: number;
	last_accessed_at: number;
	dev_mode: number;
	config_json: string | null;
	registries_json: string;
	metadata_json: string;
};

type UpsertParams = {
	session_id: string;
	created_at: number;
	last_accessed_at: number;
	dev_mode: number;
	config_json: string | null;
	registries_json: string;
	metadata_json: string;
};

const CREATE_TABLE_SQL = `
	CREATE TABLE IF NOT EXISTS sessions (
		session_id TEXT PRIMARY KEY,
		created_at INTEGER NOT NULL,
		last_accessed_at INTEGER NOT NULL,
		dev_mode INTEGER NOT NULL,
		config_json TEXT,
		registries_json TEXT NOT NULL,
		metadata_json TEXT NOT NULL
	)
`.trim();

const SELECT_SESSIONS_SQL = `
	SELECT
		session_id,
		created_at,
		last_accessed_at,
		dev_mode,
		config_json,
		registries_json,
		metadata_json
	FROM sessions
`.trim();

const UPSERT_SESSION_SQL = `
	INSERT INTO sessions (
		session_id,
		created_at,
		last_accessed_at,
		dev_mode,
		config_json,
		registries_json,
		metadata_json
	) VALUES (
		@session_id,
		@created_at,
		@last_accessed_at,
		@dev_mode,
		@config_json,
		@registries_json,
		@metadata_json
	)
	ON CONFLICT(session_id) DO UPDATE SET
		created_at = excluded.created_at,
		last_accessed_at = excluded.last_accessed_at,
		dev_mode = excluded.dev_mode,
		config_json = excluded.config_json,
		registries_json = excluded.registries_json,
		metadata_json = excluded.metadata_json
`.trim();

const DELETE_SESSION_SQL = `
	DELETE FROM sessions
	WHERE session_id = ?
`.trim();

export class SQLiteSessionStore implements SessionStore {
	private readonly database: BetterSqliteDatabase;

	private readonly selectStatement: Statement<[], SessionRow>;

	private readonly upsertStatement: Statement<[UpsertParams]>;

	private readonly deleteStatement: Statement<[string]>;

	public constructor(filePath: string) {
		this.database = new Database(filePath);
		this.database.pragma('journal_mode = WAL');
		this.database.exec(CREATE_TABLE_SQL);
		this.selectStatement = this.database.prepare<[], SessionRow>(
			SELECT_SESSIONS_SQL,
		);
		this.upsertStatement =
			this.database.prepare<UpsertParams>(UPSERT_SESSION_SQL);
		this.deleteStatement = this.database.prepare<[string]>(DELETE_SESSION_SQL);
	}

	public loadAll(): SessionRecord[] {
		const rows = this.selectStatement.all();
		return rows.map((row) => {
			const configJson = row.config_json;
			const config = configJson
				? (JSON.parse(configJson) as SessionRecord['config'])
				: undefined;
			const registries = JSON.parse(
				row.registries_json,
			) as SessionRecord['registries'];
			const metadata = JSON.parse(
				row.metadata_json,
			) as SessionRecord['metadata'];
			return {
				sessionId: row.session_id,
				createdAt: row.created_at,
				lastAccessedAt: row.last_accessed_at,
				devMode: row.dev_mode === 1,
				config,
				registries,
				metadata,
			} satisfies SessionRecord;
		});
	}

	public save(record: SessionRecord): void {
		const configValue = record.config;
		const configJson =
			configValue === undefined
				? null
				: JSON.stringify(
						structuredClone(configValue) as SessionRecord['config'],
					);
		const registriesJson = JSON.stringify(structuredClone(record.registries));
		const metadataJson = JSON.stringify(structuredClone(record.metadata));
		const params: UpsertParams = {
			session_id: record.sessionId,
			created_at: record.createdAt,
			last_accessed_at: record.lastAccessedAt,
			dev_mode: record.devMode ? 1 : 0,
			config_json: configJson,
			registries_json: registriesJson,
			metadata_json: metadataJson,
		};
		this.upsertStatement.run(params);
	}

	public delete(sessionId: string): void {
		this.deleteStatement.run(sessionId);
	}

	public close(): void {
		this.database.close();
	}
}
