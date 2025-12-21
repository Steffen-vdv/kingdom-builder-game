import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { rmSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { Database } from '../../src/database/Database.js';
import { MigrationRunner } from '../../src/database/MigrationRunner.js';
import {
	SessionPersistence,
	type PersistedSessionData,
} from '../../src/session/SessionPersistence.js';
import type {
	SessionSnapshot,
	SessionRegistriesPayload,
} from '@kingdom-builder/protocol';
import type { SessionStaticMetadataPayload } from '../../src/session/buildSessionMetadata.js';

function createMinimalSnapshot(): SessionSnapshot {
	return {
		game: {
			players: [],
			turn: 1,
			devMode: false,
		},
		phase: {
			index: 0,
			id: 'main',
			step: 0,
		},
		rules: {
			defaultActionAPCost: 1,
			absorptionCapPct: 1,
			absorptionRounding: 'down',
			tieredResourceKey: 'resource:test',
			tierDefinitions: [],
			slotsPerNewLand: 1,
			maxSlotsPerLand: 1,
			basePopulationCap: 10,
			winConditions: [],
		},
		logs: [],
		metadata: {},
	};
}

function createMinimalRegistries(): SessionRegistriesPayload {
	return {
		actions: {},
		actionCategories: {},
		buildings: {},
		developments: {},
		resources: {},
		resourceGroups: {},
		resourceCategories: {},
	};
}

function createMinimalMetadata(): SessionStaticMetadataPayload {
	return {
		resources: {},
		buildings: {},
		developments: {},
		actions: {},
		triggers: {},
		overview: { hero: undefined },
	};
}

function createTestSessionData(
	sessionId: string,
	overrides: Partial<PersistedSessionData> = {},
): PersistedSessionData {
	return {
		sessionId,
		creationOptions: { devMode: false },
		actionLog: [],
		lastSnapshot: createMinimalSnapshot(),
		registries: createMinimalRegistries(),
		metadata: createMinimalMetadata(),
		lastAccessedAt: Date.now(),
		createdAt: Date.now(),
		...overrides,
	};
}

describe('SessionPersistence', () => {
	let testDir: string;
	let dbPath: string;
	let database: Database;
	let persistence: SessionPersistence;

	beforeEach(() => {
		testDir = join(tmpdir(), `kb-persistence-test-${Date.now()}`);
		mkdirSync(testDir, { recursive: true });
		dbPath = join(testDir, 'test.db');
		database = new Database({ path: dbPath });
		database.open();
		// Run migrations to create schema
		const migrationRunner = new MigrationRunner(database);
		migrationRunner.run();
		persistence = new SessionPersistence(database);
	});

	afterEach(() => {
		database.close();
		rmSync(testDir, { recursive: true, force: true });
	});

	describe('save', () => {
		it('saves a new session to the database', () => {
			const data = createTestSessionData('session-1');
			persistence.save(data);
			expect(persistence.exists('session-1')).toBe(true);
		});

		it('updates an existing session on conflict', () => {
			const data = createTestSessionData('session-1');
			persistence.save(data);
			const updated = createTestSessionData('session-1', {
				actionLog: [{ type: 'advance' }],
			});
			persistence.save(updated);
			const loaded = persistence.load('session-1');
			expect(loaded?.actionLog).toEqual([{ type: 'advance' }]);
		});
	});

	describe('load', () => {
		it('returns undefined for non-existent session', () => {
			expect(persistence.load('missing')).toBeUndefined();
		});

		it('loads a previously saved session', () => {
			const data = createTestSessionData('session-1', {
				creationOptions: { devMode: true },
			});
			persistence.save(data);
			const loaded = persistence.load('session-1');
			expect(loaded).toBeDefined();
			expect(loaded?.sessionId).toBe('session-1');
			expect(loaded?.creationOptions.devMode).toBe(true);
		});

		it('returns undefined and deletes expired sessions', () => {
			const now = Date.now();
			const expiredTime = now - 25 * 60 * 60 * 1000; // 25 hours ago
			const data = createTestSessionData('session-1', {
				lastAccessedAt: expiredTime,
			});
			persistence.save(data);
			// Create persistence with custom now function
			const testPersistence = new SessionPersistence(database, {
				now: () => now,
			});
			const loaded = testPersistence.load('session-1');
			expect(loaded).toBeUndefined();
			// Session should have been deleted
			expect(persistence.exists('session-1')).toBe(false);
		});

		it('preserves action log entries with all fields', () => {
			const data = createTestSessionData('session-1', {
				actionLog: [
					{ type: 'action', actionId: 'test-action', params: { value: 1 } },
					{ type: 'advance' },
					{ type: 'player-name', playerId: 'p1', name: 'Alice' },
					{ type: 'dev-mode', enabled: true },
				],
			});
			persistence.save(data);
			const loaded = persistence.load('session-1');
			expect(loaded?.actionLog).toEqual(data.actionLog);
		});
	});

	describe('touch', () => {
		it('updates the last_accessed_at timestamp', () => {
			const baseTime = Date.now();
			let now = baseTime;
			const testPersistence = new SessionPersistence(database, {
				now: () => now,
			});
			const data = createTestSessionData('session-1', {
				lastAccessedAt: baseTime,
			});
			persistence.save(data);
			now = baseTime + 5000;
			testPersistence.touch('session-1');
			// Use testPersistence to load with the same time context
			const loaded = testPersistence.load('session-1');
			expect(loaded?.lastAccessedAt).toBe(baseTime + 5000);
		});
	});

	describe('appendAction', () => {
		it('appends an action to the action log', () => {
			const data = createTestSessionData('session-1');
			persistence.save(data);
			persistence.appendAction(
				'session-1',
				{ type: 'action', actionId: 'test-action' },
				createMinimalSnapshot(),
				createMinimalRegistries(),
				createMinimalMetadata(),
			);
			const loaded = persistence.load('session-1');
			expect(loaded?.actionLog).toHaveLength(1);
			expect(loaded?.actionLog[0]).toEqual({
				type: 'action',
				actionId: 'test-action',
			});
		});

		it('appends multiple actions sequentially', () => {
			const data = createTestSessionData('session-1');
			persistence.save(data);
			persistence.appendAction(
				'session-1',
				{ type: 'action', actionId: 'action-1' },
				createMinimalSnapshot(),
				createMinimalRegistries(),
				createMinimalMetadata(),
			);
			persistence.appendAction(
				'session-1',
				{ type: 'advance' },
				createMinimalSnapshot(),
				createMinimalRegistries(),
				createMinimalMetadata(),
			);
			persistence.appendAction(
				'session-1',
				{ type: 'action', actionId: 'action-2' },
				createMinimalSnapshot(),
				createMinimalRegistries(),
				createMinimalMetadata(),
			);
			const loaded = persistence.load('session-1');
			expect(loaded?.actionLog).toHaveLength(3);
			expect(loaded?.actionLog[0]).toEqual({
				type: 'action',
				actionId: 'action-1',
			});
			expect(loaded?.actionLog[1]).toEqual({ type: 'advance' });
			expect(loaded?.actionLog[2]).toEqual({
				type: 'action',
				actionId: 'action-2',
			});
		});

		it('updates the snapshot along with appending action', () => {
			const data = createTestSessionData('session-1');
			persistence.save(data);
			const updatedSnapshot = createMinimalSnapshot();
			updatedSnapshot.game.turn = 5;
			persistence.appendAction(
				'session-1',
				{ type: 'advance' },
				updatedSnapshot,
				createMinimalRegistries(),
				createMinimalMetadata(),
			);
			const loaded = persistence.load('session-1');
			expect(loaded?.lastSnapshot.game.turn).toBe(5);
		});
	});

	describe('delete', () => {
		it('deletes an existing session', () => {
			const data = createTestSessionData('session-1');
			persistence.save(data);
			expect(persistence.exists('session-1')).toBe(true);
			const deleted = persistence.delete('session-1');
			expect(deleted).toBe(true);
			expect(persistence.exists('session-1')).toBe(false);
		});

		it('returns false when deleting non-existent session', () => {
			const deleted = persistence.delete('missing');
			expect(deleted).toBe(false);
		});
	});

	describe('purgeExpired', () => {
		it('deletes sessions older than 24 hours', () => {
			const now = Date.now();
			const oldTime = now - 25 * 60 * 60 * 1000; // 25 hours ago
			const freshTime = now - 1 * 60 * 60 * 1000; // 1 hour ago
			persistence.save(
				createTestSessionData('old-session', { lastAccessedAt: oldTime }),
			);
			persistence.save(
				createTestSessionData('fresh-session', { lastAccessedAt: freshTime }),
			);
			const testPersistence = new SessionPersistence(database, {
				now: () => now,
			});
			const purged = testPersistence.purgeExpired();
			expect(purged).toBe(1);
			expect(persistence.exists('old-session')).toBe(false);
			expect(persistence.exists('fresh-session')).toBe(true);
		});

		it('returns zero when no sessions expired', () => {
			const now = Date.now();
			persistence.save(
				createTestSessionData('session-1', { lastAccessedAt: now }),
			);
			const testPersistence = new SessionPersistence(database, {
				now: () => now,
			});
			const purged = testPersistence.purgeExpired();
			expect(purged).toBe(0);
		});
	});

	describe('exists', () => {
		it('returns true for existing non-expired session', () => {
			persistence.save(createTestSessionData('session-1'));
			expect(persistence.exists('session-1')).toBe(true);
		});

		it('returns false for non-existent session', () => {
			expect(persistence.exists('missing')).toBe(false);
		});

		it('returns false for expired session', () => {
			const now = Date.now();
			const expiredTime = now - 25 * 60 * 60 * 1000;
			persistence.save(
				createTestSessionData('session-1', { lastAccessedAt: expiredTime }),
			);
			const testPersistence = new SessionPersistence(database, {
				now: () => now,
			});
			expect(testPersistence.exists('session-1')).toBe(false);
		});
	});

	describe('getCount', () => {
		it('returns zero for empty database', () => {
			expect(persistence.getCount()).toBe(0);
		});

		it('returns count of non-expired sessions', () => {
			const now = Date.now();
			const expiredTime = now - 25 * 60 * 60 * 1000;
			persistence.save(
				createTestSessionData('session-1', { lastAccessedAt: now }),
			);
			persistence.save(
				createTestSessionData('session-2', { lastAccessedAt: now }),
			);
			persistence.save(
				createTestSessionData('expired', { lastAccessedAt: expiredTime }),
			);
			const testPersistence = new SessionPersistence(database, {
				now: () => now,
			});
			expect(testPersistence.getCount()).toBe(2);
		});
	});
});
