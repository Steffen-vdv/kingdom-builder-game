import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { rmSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { Database } from '../../src/database/Database';
import { MigrationRunner } from '../../src/database/MigrationRunner';

describe('MigrationRunner', () => {
	let testDir: string;
	let dbPath: string;
	let migrationsPath: string;
	let db: Database;

	beforeEach(() => {
		testDir = join(tmpdir(), `kb-migration-test-${Date.now()}`);
		mkdirSync(testDir, { recursive: true });
		dbPath = join(testDir, 'test.db');
		migrationsPath = join(testDir, 'migrations');
		mkdirSync(migrationsPath);

		db = new Database({ path: dbPath });
		db.open();
	});

	afterEach(() => {
		db.close();
		rmSync(testDir, { recursive: true, force: true });
	});

	describe('run', () => {
		it('creates schema_migrations table', () => {
			writeFileSync(
				join(migrationsPath, '001_init.sql'),
				'SELECT 1;', // No-op migration
			);
			const runner = new MigrationRunner(db, { migrationsPath });
			runner.run();

			const table = db
				.prepare<
					[],
					{ name: string }
				>("SELECT name FROM sqlite_master WHERE type='table' " + "AND name='schema_migrations'")
				.get();
			expect(table?.name).toBe('schema_migrations');
		});

		it('throws when migrations directory is missing', () => {
			rmSync(migrationsPath, { recursive: true });
			const runner = new MigrationRunner(db, { migrationsPath });

			expect(() => runner.run()).toThrow('Migrations directory not found');
		});

		it('throws when migrations directory is empty', () => {
			// migrationsPath exists but has no .sql files
			const runner = new MigrationRunner(db, { migrationsPath });

			expect(() => runner.run()).toThrow('No migration files found');
		});

		it('applies migrations in order', () => {
			writeFileSync(
				join(migrationsPath, '001_create_users.sql'),
				'CREATE TABLE users (id INTEGER PRIMARY KEY);',
			);
			writeFileSync(
				join(migrationsPath, '002_create_posts.sql'),
				'CREATE TABLE posts (id INTEGER PRIMARY KEY, user_id INTEGER);',
			);

			const runner = new MigrationRunner(db, { migrationsPath });
			const result = runner.run();

			expect(result.applied).toHaveLength(2);
			expect(result.applied[0].name).toBe('create users');
			expect(result.applied[1].name).toBe('create posts');
			expect(result.alreadyUpToDate).toBe(false);

			// Verify tables exist
			const tables = db
				.prepare<
					[],
					{ name: string }
				>("SELECT name FROM sqlite_master WHERE type='table' " + "AND name IN ('users', 'posts') ORDER BY name")
				.all();
			expect(tables.map((t) => t.name)).toEqual(['posts', 'users']);
		});

		it('skips already applied migrations', () => {
			writeFileSync(
				join(migrationsPath, '001_create_users.sql'),
				'CREATE TABLE users (id INTEGER PRIMARY KEY);',
			);

			const runner = new MigrationRunner(db, { migrationsPath });

			// First run
			const result1 = runner.run();
			expect(result1.applied).toHaveLength(1);

			// Second run
			const result2 = runner.run();
			expect(result2.applied).toHaveLength(0);
			expect(result2.alreadyUpToDate).toBe(true);
		});

		it('applies only new migrations', () => {
			writeFileSync(
				join(migrationsPath, '001_create_users.sql'),
				'CREATE TABLE users (id INTEGER PRIMARY KEY);',
			);

			const runner = new MigrationRunner(db, { migrationsPath });
			runner.run();

			// Add new migration
			writeFileSync(
				join(migrationsPath, '002_create_posts.sql'),
				'CREATE TABLE posts (id INTEGER PRIMARY KEY);',
			);

			const result = runner.run();
			expect(result.applied).toHaveLength(1);
			expect(result.applied[0].version).toBe(2);
		});

		it('throws on invalid migration filename', () => {
			writeFileSync(
				join(migrationsPath, 'invalid_name.sql'),
				'CREATE TABLE test (id INTEGER);',
			);

			const runner = new MigrationRunner(db, { migrationsPath });

			expect(() => runner.run()).toThrow('Invalid migration filename');
		});

		it('throws on migration failure and does not commit', () => {
			writeFileSync(
				join(migrationsPath, '001_bad_sql.sql'),
				'THIS IS NOT VALID SQL;',
			);

			const runner = new MigrationRunner(db, { migrationsPath });

			expect(() => runner.run()).toThrow('Migration 001_bad_sql.sql failed');

			// Verify migration was not recorded
			const applied = runner.getAppliedMigrations();
			expect(applied).toHaveLength(0);
		});
	});

	describe('getCurrentVersion', () => {
		it('returns 0 when no migrations applied', () => {
			const runner = new MigrationRunner(db, { migrationsPath });
			expect(runner.getCurrentVersion()).toBe(0);
		});

		it('returns highest applied version', () => {
			writeFileSync(
				join(migrationsPath, '001_first.sql'),
				'CREATE TABLE first (id INTEGER);',
			);
			writeFileSync(
				join(migrationsPath, '002_second.sql'),
				'CREATE TABLE second (id INTEGER);',
			);

			const runner = new MigrationRunner(db, { migrationsPath });
			runner.run();

			expect(runner.getCurrentVersion()).toBe(2);
		});
	});

	describe('getAppliedMigrations', () => {
		it('returns empty array when no migrations', () => {
			const runner = new MigrationRunner(db, { migrationsPath });
			expect(runner.getAppliedMigrations()).toEqual([]);
		});

		it('returns applied migrations in order', () => {
			writeFileSync(
				join(migrationsPath, '001_first.sql'),
				'CREATE TABLE first (id INTEGER);',
			);
			writeFileSync(
				join(migrationsPath, '002_second.sql'),
				'CREATE TABLE second (id INTEGER);',
			);

			const runner = new MigrationRunner(db, { migrationsPath });
			runner.run();

			const applied = runner.getAppliedMigrations();
			expect(applied).toHaveLength(2);
			expect(applied[0].version).toBe(1);
			expect(applied[0].name).toBe('first');
			expect(applied[1].version).toBe(2);
			expect(applied[1].name).toBe('second');
		});
	});

	describe('getPendingMigrations', () => {
		it('returns all migrations when none applied', () => {
			writeFileSync(
				join(migrationsPath, '001_first.sql'),
				'CREATE TABLE first (id INTEGER);',
			);
			writeFileSync(
				join(migrationsPath, '002_second.sql'),
				'CREATE TABLE second (id INTEGER);',
			);

			const runner = new MigrationRunner(db, { migrationsPath });
			const pending = runner.getPendingMigrations();

			expect(pending).toHaveLength(2);
			expect(pending[0].version).toBe(1);
			expect(pending[1].version).toBe(2);
		});

		it('returns only unapplied migrations', () => {
			writeFileSync(
				join(migrationsPath, '001_first.sql'),
				'CREATE TABLE first (id INTEGER);',
			);

			const runner = new MigrationRunner(db, { migrationsPath });
			runner.run();

			writeFileSync(
				join(migrationsPath, '002_second.sql'),
				'CREATE TABLE second (id INTEGER);',
			);

			const pending = runner.getPendingMigrations();
			expect(pending).toHaveLength(1);
			expect(pending[0].version).toBe(2);
		});
	});
});
