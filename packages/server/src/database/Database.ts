import BetterSqlite3 from 'better-sqlite3';
import type { Database as BetterSqlite3Database } from 'better-sqlite3';

export interface DatabaseOptions {
	/**
	 * Path to the SQLite database file.
	 * Defaults to KB_DATABASE_PATH env var, or './data/kingdom-builder.db'.
	 */
	path?: string;
	/**
	 * Environment variables to read configuration from.
	 */
	env?: NodeJS.ProcessEnv;
}

/**
 * Manages the SQLite database connection for Kingdom Builder.
 *
 * This class provides a thin wrapper around better-sqlite3 with:
 * - Configurable database path via options or environment variable
 * - WAL mode for better concurrent read performance
 * - Explicit lifecycle management (open/close)
 */
export class Database {
	private readonly path: string;
	private connection: BetterSqlite3Database | null = null;

	constructor(options: DatabaseOptions = {}) {
		this.path = resolveDatabasePath(options);
	}

	/**
	 * Opens the database connection.
	 * Creates the database file and parent directories if they don't exist.
	 * Enables WAL mode for better performance.
	 *
	 * @throws Error if the database is already open
	 */
	public open(): void {
		if (this.connection !== null) {
			throw new Error('Database is already open');
		}
		this.connection = new BetterSqlite3(this.path);
		this.connection.pragma('journal_mode = WAL');
	}

	/**
	 * Closes the database connection.
	 * Safe to call even if not open (no-op).
	 */
	public close(): void {
		if (this.connection !== null) {
			this.connection.close();
			this.connection = null;
		}
	}

	/**
	 * Returns the underlying better-sqlite3 connection.
	 *
	 * @throws Error if the database is not open
	 */
	public getConnection(): BetterSqlite3Database {
		if (this.connection === null) {
			throw new Error(
				'Database is not open. Call open() before accessing the connection.',
			);
		}
		return this.connection;
	}

	/**
	 * Returns true if the database connection is open.
	 */
	public isOpen(): boolean {
		return this.connection !== null;
	}

	/**
	 * Returns the configured database file path.
	 */
	public getPath(): string {
		return this.path;
	}

	/**
	 * Executes a raw SQL statement.
	 * Use for DDL statements or when you need direct access.
	 *
	 * @throws Error if the database is not open
	 */
	public exec(sql: string): void {
		this.getConnection().exec(sql);
	}

	/**
	 * Prepares a SQL statement for execution.
	 *
	 * @throws Error if the database is not open
	 */
	public prepare<T = unknown>(sql: string): BetterSqlite3.Statement<T[]> {
		return this.getConnection().prepare<T[]>(sql);
	}

	/**
	 * Runs a function within a transaction.
	 * Automatically commits on success, rolls back on error.
	 */
	public transaction<T>(fn: () => T): T {
		const db = this.getConnection();
		const transaction = db.transaction(fn);
		return transaction();
	}
}

const DEFAULT_DATABASE_PATH = './data/kingdom-builder.db';

function resolveDatabasePath(options: DatabaseOptions): string {
	if (options.path) {
		return options.path;
	}
	const env = options.env ?? process.env;
	const envPath = env.KB_DATABASE_PATH;
	if (envPath && envPath.trim().length > 0) {
		return envPath.trim();
	}
	return DEFAULT_DATABASE_PATH;
}
