import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { rmSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { Database } from '../../src/database/Database.js';
import { MigrationRunner } from '../../src/database/MigrationRunner.js';
import { SessionPersistence } from '../../src/session/SessionPersistence.js';
import {
	recordAction,
	recordAdvance,
	recordPlayerNameChange,
	recordDevModeChange,
	type SessionRecordWithLog,
} from '../../src/session/SessionRecorder.js';
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

interface MockRecord extends SessionRecordWithLog {
	getSnapshot: ReturnType<typeof vi.fn<() => SessionSnapshot>>;
}

function createMockRecord(): MockRecord {
	return {
		actionLog: [],
		getSnapshot: vi.fn(() => createMinimalSnapshot()),
		registries: createMinimalRegistries(),
		metadata: createMinimalMetadata(),
	};
}

describe('SessionRecorder', () => {
	describe('without persistence', () => {
		it('recordAction adds entry to action log', () => {
			const record = createMockRecord();
			recordAction('session-1', record, undefined, 'test-action');
			expect(record.actionLog).toHaveLength(1);
			expect(record.actionLog[0]).toEqual({
				type: 'action',
				actionId: 'test-action',
			});
		});

		it('recordAction includes params when provided', () => {
			const record = createMockRecord();
			recordAction('session-1', record, undefined, 'test-action', {
				value: 42,
			});
			expect(record.actionLog[0]).toEqual({
				type: 'action',
				actionId: 'test-action',
				params: { value: 42 },
			});
		});

		it('recordAdvance adds entry to action log', () => {
			const record = createMockRecord();
			recordAdvance('session-1', record, undefined);
			expect(record.actionLog).toHaveLength(1);
			expect(record.actionLog[0]).toEqual({ type: 'advance' });
		});

		it('recordPlayerNameChange adds entry to action log', () => {
			const record = createMockRecord();
			recordPlayerNameChange('session-1', record, undefined, 'p1', 'Alice');
			expect(record.actionLog).toHaveLength(1);
			expect(record.actionLog[0]).toEqual({
				type: 'player-name',
				playerId: 'p1',
				name: 'Alice',
			});
		});

		it('recordDevModeChange adds entry to action log', () => {
			const record = createMockRecord();
			recordDevModeChange('session-1', record, undefined, true);
			expect(record.actionLog).toHaveLength(1);
			expect(record.actionLog[0]).toEqual({ type: 'dev-mode', enabled: true });
		});

		it('does not call getSnapshot when persistence is undefined', () => {
			const record = createMockRecord();
			recordAction('session-1', record, undefined, 'test-action');
			expect(record.getSnapshot).not.toHaveBeenCalled();
		});
	});

	describe('with persistence', () => {
		let testDir: string;
		let dbPath: string;
		let database: Database;
		let persistence: SessionPersistence;

		beforeEach(() => {
			testDir = join(tmpdir(), `kb-recorder-test-${Date.now()}`);
			mkdirSync(testDir, { recursive: true });
			dbPath = join(testDir, 'test.db');
			database = new Database({ path: dbPath });
			database.open();
			const migrationRunner = new MigrationRunner(database);
			migrationRunner.run();
			persistence = new SessionPersistence(database);

			// Create initial session in database
			persistence.save({
				sessionId: 'session-1',
				creationOptions: { devMode: false },
				actionLog: [],
				lastSnapshot: createMinimalSnapshot(),
				registries: createMinimalRegistries(),
				metadata: createMinimalMetadata(),
				lastAccessedAt: Date.now(),
				createdAt: Date.now(),
			});
		});

		afterEach(() => {
			database.close();
			rmSync(testDir, { recursive: true, force: true });
		});

		it('recordAction persists to database', () => {
			const record = createMockRecord();
			recordAction('session-1', record, persistence, 'test-action');

			const loaded = persistence.load('session-1');
			expect(loaded?.actionLog).toHaveLength(1);
			expect(loaded?.actionLog[0]).toEqual({
				type: 'action',
				actionId: 'test-action',
			});
		});

		it('recordAction calls getSnapshot when persisting', () => {
			const record = createMockRecord();
			recordAction('session-1', record, persistence, 'test-action');
			expect(record.getSnapshot).toHaveBeenCalledOnce();
		});

		it('recordAdvance persists to database', () => {
			const record = createMockRecord();
			recordAdvance('session-1', record, persistence);

			const loaded = persistence.load('session-1');
			expect(loaded?.actionLog).toHaveLength(1);
			expect(loaded?.actionLog[0]).toEqual({ type: 'advance' });
		});

		it('recordPlayerNameChange persists to database', () => {
			const record = createMockRecord();
			recordPlayerNameChange('session-1', record, persistence, 'p2', 'Bob');

			const loaded = persistence.load('session-1');
			expect(loaded?.actionLog).toHaveLength(1);
			expect(loaded?.actionLog[0]).toEqual({
				type: 'player-name',
				playerId: 'p2',
				name: 'Bob',
			});
		});

		it('recordDevModeChange persists to database', () => {
			const record = createMockRecord();
			recordDevModeChange('session-1', record, persistence, false);

			const loaded = persistence.load('session-1');
			expect(loaded?.actionLog).toHaveLength(1);
			expect(loaded?.actionLog[0]).toEqual({
				type: 'dev-mode',
				enabled: false,
			});
		});

		it('multiple records accumulate in order', () => {
			const record = createMockRecord();
			recordAction('session-1', record, persistence, 'action-1');
			recordAdvance('session-1', record, persistence);
			recordAction('session-1', record, persistence, 'action-2');
			recordPlayerNameChange('session-1', record, persistence, 'p1', 'Alice');

			expect(record.actionLog).toHaveLength(4);

			const loaded = persistence.load('session-1');
			expect(loaded?.actionLog).toHaveLength(4);
			expect(loaded?.actionLog[0]).toEqual({
				type: 'action',
				actionId: 'action-1',
			});
			expect(loaded?.actionLog[1]).toEqual({ type: 'advance' });
			expect(loaded?.actionLog[2]).toEqual({
				type: 'action',
				actionId: 'action-2',
			});
			expect(loaded?.actionLog[3]).toEqual({
				type: 'player-name',
				playerId: 'p1',
				name: 'Alice',
			});
		});
	});
});
