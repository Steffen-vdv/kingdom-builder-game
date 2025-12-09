import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { existsSync, rmSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { Database } from '../../src/database/Database';

describe('Database', () => {
	let testDir: string;
	let dbPath: string;

	beforeEach(() => {
		testDir = join(tmpdir(), `kb-db-test-${Date.now()}`);
		mkdirSync(testDir, { recursive: true });
		dbPath = join(testDir, 'test.db');
	});

	afterEach(() => {
		rmSync(testDir, { recursive: true, force: true });
	});

	describe('constructor', () => {
		it('uses provided path', () => {
			const db = new Database({ path: dbPath });
			expect(db.getPath()).toBe(dbPath);
		});

		it('uses environment variable when no path provided', () => {
			const env = { KB_DATABASE_PATH: '/custom/path.db' };
			const db = new Database({ env });
			expect(db.getPath()).toBe('/custom/path.db');
		});

		it('uses default path when nothing provided', () => {
			const db = new Database();
			expect(db.getPath()).toBe('./data/kingdom-builder.db');
		});
	});

	describe('open/close', () => {
		it('creates database file on open', () => {
			const db = new Database({ path: dbPath });
			expect(existsSync(dbPath)).toBe(false);

			db.open();
			expect(existsSync(dbPath)).toBe(true);
			expect(db.isOpen()).toBe(true);

			db.close();
			expect(db.isOpen()).toBe(false);
		});

		it('throws when opening already open database', () => {
			const db = new Database({ path: dbPath });
			db.open();

			expect(() => db.open()).toThrow('Database is already open');

			db.close();
		});

		it('close is safe to call multiple times', () => {
			const db = new Database({ path: dbPath });
			db.open();

			db.close();
			db.close(); // Should not throw

			expect(db.isOpen()).toBe(false);
		});
	});

	describe('getConnection', () => {
		it('throws when database not open', () => {
			const db = new Database({ path: dbPath });

			expect(() => db.getConnection()).toThrow('Database is not open');
		});

		it('returns connection when open', () => {
			const db = new Database({ path: dbPath });
			db.open();

			const conn = db.getConnection();
			expect(conn).toBeDefined();

			db.close();
		});
	});

	describe('exec', () => {
		it('executes SQL statements', () => {
			const db = new Database({ path: dbPath });
			db.open();

			db.exec('CREATE TABLE test (id INTEGER PRIMARY KEY, value TEXT)');

			const conn = db.getConnection();
			const result = conn
				.prepare<
					[],
					{ name: string }
				>("SELECT name FROM sqlite_master WHERE type='table' AND name='test'")
				.get();
			expect(result?.name).toBe('test');

			db.close();
		});
	});

	describe('prepare', () => {
		it('prepares parameterized statements', () => {
			const db = new Database({ path: dbPath });
			db.open();

			db.exec('CREATE TABLE test (id INTEGER PRIMARY KEY, value TEXT)');

			const insert = db.prepare<[string]>(
				'INSERT INTO test (value) VALUES (?)',
			);
			insert.run('hello');

			const select = db.prepare<[], { value: string }>(
				'SELECT value FROM test',
			);
			const result = select.get();
			expect(result?.value).toBe('hello');

			db.close();
		});
	});

	describe('transaction', () => {
		it('commits on success', () => {
			const db = new Database({ path: dbPath });
			db.open();

			db.exec('CREATE TABLE test (id INTEGER PRIMARY KEY, value TEXT)');

			db.transaction(() => {
				const stmt = db.prepare<[string]>(
					'INSERT INTO test (value) VALUES (?)',
				);
				stmt.run('one');
				stmt.run('two');
			});

			const count = db
				.prepare<[], { cnt: number }>('SELECT COUNT(*) as cnt FROM test')
				.get();
			expect(count?.cnt).toBe(2);

			db.close();
		});

		it('rolls back on error', () => {
			const db = new Database({ path: dbPath });
			db.open();

			db.exec('CREATE TABLE test (id INTEGER PRIMARY KEY, value TEXT)');

			try {
				db.transaction(() => {
					const stmt = db.prepare<[string]>(
						'INSERT INTO test (value) VALUES (?)',
					);
					stmt.run('one');
					throw new Error('Test error');
				});
			} catch {
				// Expected
			}

			const count = db
				.prepare<[], { cnt: number }>('SELECT COUNT(*) as cnt FROM test')
				.get();
			expect(count?.cnt).toBe(0);

			db.close();
		});
	});
});
