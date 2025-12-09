import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join, basename } from 'node:path';
import type { Database } from './Database.js';

export interface MigrationRunnerOptions {
	/**
	 * Path to the directory containing migration SQL files.
	 * Defaults to './migrations' relative to the server package.
	 */
	migrationsPath?: string;
}

export interface MigrationRecord {
	version: number;
	name: string;
	appliedAt: string;
}

export interface MigrationResult {
	applied: MigrationRecord[];
	skipped: number;
	alreadyUpToDate: boolean;
}

/**
 * Migration file naming convention:
 * - Format: NNN_description.sql (e.g., 001_create_visitor_stats.sql)
 * - NNN is a zero-padded version number (001, 002, etc.)
 * - Description uses underscores for spaces
 * - Files are applied in numerical order
 * - Each migration runs exactly once (tracked in schema_migrations table)
 */
export class MigrationRunner {
	private readonly database: Database;
	private readonly migrationsPath: string;

	constructor(database: Database, options: MigrationRunnerOptions = {}) {
		this.database = database;
		this.migrationsPath = options.migrationsPath ?? getDefaultMigrationsPath();
	}

	/**
	 * Runs all pending migrations.
	 * Creates the schema_migrations tracking table if it doesn't exist.
	 *
	 * @returns Summary of applied migrations
	 * @throws Error if any migration fails (partial migrations are rolled back)
	 */
	public run(): MigrationResult {
		this.ensureMigrationsTable();

		const pendingMigrations = this.getPendingMigrations();
		if (pendingMigrations.length === 0) {
			return {
				applied: [],
				skipped: 0,
				alreadyUpToDate: true,
			};
		}

		const applied: MigrationRecord[] = [];
		const db = this.database.getConnection();

		for (const migration of pendingMigrations) {
			const runMigration = db.transaction(() => {
				db.exec(migration.sql);
				const stmt = db.prepare<[number, string]>(
					'INSERT INTO schema_migrations (version, name) VALUES (?, ?)',
				);
				stmt.run(migration.version, migration.name);
			});

			try {
				runMigration();
				const record: MigrationRecord = {
					version: migration.version,
					name: migration.name,
					appliedAt: new Date().toISOString(),
				};
				applied.push(record);
			} catch (error) {
				const message = error instanceof Error ? error.message : String(error);
				throw new Error(`Migration ${migration.filename} failed: ${message}`);
			}
		}

		return {
			applied,
			skipped: 0,
			alreadyUpToDate: false,
		};
	}

	/**
	 * Returns the current schema version (highest applied migration number).
	 * Returns 0 if no migrations have been applied.
	 */
	public getCurrentVersion(): number {
		this.ensureMigrationsTable();
		const db = this.database.getConnection();
		const stmt = db.prepare<[], { version: number }>(
			'SELECT MAX(version) as version FROM schema_migrations',
		);
		const result = stmt.get();
		return result?.version ?? 0;
	}

	/**
	 * Returns all applied migrations.
	 */
	public getAppliedMigrations(): MigrationRecord[] {
		this.ensureMigrationsTable();
		const db = this.database.getConnection();
		const stmt = db.prepare<[], MigrationRecord>(
			'SELECT version, name, applied_at as appliedAt ' +
				'FROM schema_migrations ORDER BY version',
		);
		return stmt.all();
	}

	/**
	 * Returns pending migrations that haven't been applied yet.
	 */
	public getPendingMigrations(): ParsedMigration[] {
		const appliedVersions = new Set(
			this.getAppliedMigrations().map((migration) => migration.version),
		);
		const allMigrations = this.loadMigrationFiles();
		return allMigrations.filter(
			(migration) => !appliedVersions.has(migration.version),
		);
	}

	private ensureMigrationsTable(): void {
		this.database.exec(`
			CREATE TABLE IF NOT EXISTS schema_migrations (
				version INTEGER PRIMARY KEY,
				name TEXT NOT NULL,
				applied_at TEXT NOT NULL DEFAULT (datetime('now'))
			)
		`);
	}

	private loadMigrationFiles(): ParsedMigration[] {
		if (!existsSync(this.migrationsPath)) {
			throw new Error(
				`Migrations directory not found: ${this.migrationsPath}. ` +
					'Ensure migrations are included in the build output.',
			);
		}

		const files = readdirSync(this.migrationsPath)
			.filter((f) => f.endsWith('.sql'))
			.sort();

		if (files.length === 0) {
			throw new Error(
				`No migration files found in: ${this.migrationsPath}. ` +
					'At least one migration is required for database initialization.',
			);
		}

		return files.map((filename) => {
			const parsed = parseMigrationFilename(filename);
			if (!parsed) {
				throw new Error(
					`Invalid migration filename: ${filename}. ` +
						'Expected format: NNN_description.sql',
				);
			}
			const filePath = join(this.migrationsPath, filename);
			const sql = readFileSync(filePath, 'utf-8');
			return {
				...parsed,
				sql,
			};
		});
	}
}

interface ParsedMigration {
	version: number;
	name: string;
	filename: string;
	sql: string;
}

const MIGRATION_FILENAME_PATTERN = /^(\d{3})_(.+)\.sql$/;

function parseMigrationFilename(
	filename: string,
): Omit<ParsedMigration, 'sql'> | null {
	const match = MIGRATION_FILENAME_PATTERN.exec(basename(filename));
	if (!match) {
		return null;
	}
	const versionStr = match[1];
	const nameWithUnderscores = match[2];
	if (!versionStr || !nameWithUnderscores) {
		return null;
	}
	return {
		version: Number.parseInt(versionStr, 10),
		name: nameWithUnderscores.replace(/_/g, ' '),
		filename,
	};
}

function getDefaultMigrationsPath(): string {
	// MigrationRunner.ts is at packages/server/src/database/ (or dist/database/)
	// Go up two levels to reach packages/server/
	const currentDir = new URL('.', import.meta.url).pathname;
	const serverRoot = join(currentDir, '..', '..');
	return join(serverRoot, 'migrations');
}
