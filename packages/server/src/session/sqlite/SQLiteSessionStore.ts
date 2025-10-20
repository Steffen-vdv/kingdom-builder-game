import { mkdirSync } from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';
import type { Database as SQLiteDatabase, Statement } from 'better-sqlite3';
import type { SessionStore, SessionStoreRecord } from '../SessionStore.js';

export interface SQLiteSessionStoreOptions {
	filePath: string;
	tableName?: string;
}

type SessionRow = {
	session_id: string;
	created_at: number;
	last_accessed_at: number;
	dev_mode: number;
	config: string | null;
	registries: string;
	metadata: string;
};

function ensureTableName(name: string): string {
	if (!/^\w+$/.test(name)) {
		throw new Error(
			'SQLite session table name must be alphanumeric or underscores.',
		);
	}
	return name;
}

function serializeRecord(record: SessionStoreRecord): {
	sessionId: string;
	createdAt: number;
	lastAccessedAt: number;
	devMode: number;
	config: string | null;
	registries: string;
	metadata: string;
} {
	return {
		sessionId: record.sessionId,
		createdAt: record.createdAt,
		lastAccessedAt: record.lastAccessedAt,
		devMode: record.devMode ? 1 : 0,
		config: record.config !== undefined ? JSON.stringify(record.config) : null,
		registries: JSON.stringify(record.registries),
		metadata: JSON.stringify(record.metadata),
	};
}

function parseRow(row: SessionRow): SessionStoreRecord {
	const config =
		row.config !== null
			? (JSON.parse(row.config) as SessionStoreRecord['config'])
			: undefined;
	return {
		sessionId: row.session_id,
		createdAt: row.created_at,
		lastAccessedAt: row.last_accessed_at,
		devMode: row.dev_mode === 1,
		registries: JSON.parse(row.registries) as SessionStoreRecord['registries'],
		metadata: JSON.parse(row.metadata) as SessionStoreRecord['metadata'],
		...(config !== undefined ? { config } : {}),
	};
}

export class SQLiteSessionStore implements SessionStore {
	private readonly database: SQLiteDatabase;

	private readonly tableName: string;

	private readonly selectStatement: Statement;

	private readonly upsertStatement: Statement;

	private readonly deleteStatement: Statement;

	public constructor(options: SQLiteSessionStoreOptions) {
		const tableName = ensureTableName(options.tableName ?? 'sessions');
		this.tableName = tableName;
		const directory = path.dirname(options.filePath);
		if (directory) {
			mkdirSync(directory, { recursive: true });
		}
		this.database = new Database(options.filePath);
		this.database.exec(
			`CREATE TABLE IF NOT EXISTS ${tableName} (` +
				'session_id TEXT PRIMARY KEY,' +
				'created_at INTEGER NOT NULL,' +
				'last_accessed_at INTEGER NOT NULL,' +
				'dev_mode INTEGER NOT NULL,' +
				'config TEXT NULL,' +
				'registries TEXT NOT NULL,' +
				'metadata TEXT NOT NULL' +
				')',
		);
		this.selectStatement = this.database.prepare(
			`SELECT session_id, created_at, last_accessed_at, dev_mode, config, registries, metadata FROM ${tableName}`,
		);
		this.upsertStatement = this.database.prepare(
			`INSERT INTO ${tableName} (session_id, created_at, last_accessed_at, dev_mode, config, registries, metadata)` +
				' VALUES (@sessionId, @createdAt, @lastAccessedAt, @devMode, @config, @registries, @metadata)' +
				' ON CONFLICT(session_id) DO UPDATE SET created_at=excluded.created_at,' +
				' last_accessed_at=excluded.last_accessed_at, dev_mode=excluded.dev_mode,' +
				' config=excluded.config, registries=excluded.registries, metadata=excluded.metadata',
		);
		this.deleteStatement = this.database.prepare(
			`DELETE FROM ${tableName} WHERE session_id = ?`,
		);
	}

	public loadAll(): SessionStoreRecord[] {
		const rows = this.selectStatement.all() as SessionRow[];
		return rows.map((row) => parseRow(row));
	}

	public save(record: SessionStoreRecord): void {
		const payload = serializeRecord(record);
		this.upsertStatement.run(payload);
	}

	public delete(sessionId: string): void {
		this.deleteStatement.run(sessionId);
	}

	public close(): void {
		this.database.close();
	}
}
