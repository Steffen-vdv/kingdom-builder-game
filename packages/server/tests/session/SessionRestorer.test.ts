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
import { SessionRestorer } from '../../src/session/SessionRestorer.js';
import {
	createContentFactory,
	createResourceRegistries,
	resourceDefinition,
} from '@kingdom-builder/testing';
import type { PhaseConfig, RuleSet } from '@kingdom-builder/protocol';
import { SystemRole } from '@kingdom-builder/contents-sdk';

function createTestSetup() {
	// Use isolated mode to avoid inheriting real actions that reference
	// resources not in our synthetic catalog
	const factory = createContentFactory({ isolated: true });
	const costResourceId = 'resource:synthetic:cost';
	const gainResourceId = 'resource:synthetic:gain';
	// Real actionMetaCategories bind actions to command-points
	const commandPointsId = 'resource:core:command-points';

	const { resources, groups } = createResourceRegistries({
		resources: [
			resourceDefinition({
				id: costResourceId,
				metadata: { label: 'Cost', icon: '💰' },
				bounds: { lowerBound: 0 },
			}),
			resourceDefinition({
				id: gainResourceId,
				metadata: { label: 'Gain', icon: '⭐' },
				bounds: { lowerBound: 0 },
			}),
			resourceDefinition({
				id: commandPointsId,
				metadata: { label: 'Command Points', icon: '⚡' },
				bounds: { lowerBound: 0 },
			}),
		],
	});

	const action = factory.action({
		baseCosts: { [costResourceId]: 1 },
		effects: [
			{
				type: 'resource',
				method: 'add',
				params: {
					resourceId: gainResourceId,
					change: { type: 'amount', amount: 1 },
				},
			},
		],
	});

	// Create synthetic system actions with systemRole for engine discovery
	const initialSetupActionId = '__synth_initial_setup__';
	const compensationActionId = '__synth_compensation__';

	factory.actions.add(initialSetupActionId, {
		id: initialSetupActionId,
		name: 'Synthetic Initial Setup',
		metaCategory: 'meta:commands',
		system: true,
		systemRole: SystemRole.INITIAL_SETUP,
		free: true,
		baseCosts: {},
		effects: [
			{
				type: 'resource',
				method: 'add',
				params: {
					resourceId: costResourceId,
					change: { type: 'amount', amount: 10 },
				},
			},
			{
				type: 'resource',
				method: 'add',
				params: {
					resourceId: commandPointsId,
					change: { type: 'amount', amount: 10 },
				},
			},
		],
	});

	factory.actions.add(compensationActionId, {
		id: compensationActionId,
		name: 'Synthetic Compensation',
		metaCategory: 'meta:commands',
		system: true,
		systemRole: SystemRole.COMPENSATION,
		free: true,
		baseCosts: {},
		effects: [],
	});

	const phases: PhaseConfig[] = [
		{ id: 'main', action: true, steps: [{ id: 'main' }] },
		{
			id: 'end',
			steps: [
				{
					id: 'refresh',
					effects: [
						{
							type: 'resource',
							method: 'add',
							params: {
								resourceId: costResourceId,
								change: { type: 'amount', amount: 5 },
							},
						},
					],
				},
			],
		},
	];

	const rules: RuleSet = {
		defaultActionAPCost: 1,
		absorptionCapPct: 1,
		absorptionRounding: 'down',
		tieredResourceKey: gainResourceId,
		tierDefinitions: [],
		slotsPerNewLand: 1,
		maxSlotsPerLand: 1,
		basePopulationCap: 10,
		winConditions: [],
	};

	const baseOptions = {
		actions: factory.actions,
		actionMetaCategories: factory.actionMetaCategories,
		buildings: factory.buildings,
		developments: factory.developments,
		phases,
		rules,
		resourceCatalog: { resources, groups },
	};

	return {
		factory,
		baseOptions,
		actionId: action.id,
		costResourceId,
		gainResourceId,
	};
}

describe('SessionRestorer', () => {
	let testDir: string;
	let dbPath: string;
	let database: Database;
	let persistence: SessionPersistence;

	beforeEach(() => {
		testDir = join(tmpdir(), `kb-restorer-test-${Date.now()}`);
		mkdirSync(testDir, { recursive: true });
		dbPath = join(testDir, 'test.db');
		database = new Database({ path: dbPath });
		database.open();
		const migrationRunner = new MigrationRunner(database);
		migrationRunner.run();
		persistence = new SessionPersistence(database);
	});

	afterEach(() => {
		database.close();
		rmSync(testDir, { recursive: true, force: true });
	});

	it('returns undefined for non-existent session', () => {
		const { baseOptions } = createTestSetup();
		const restorer = new SessionRestorer({ persistence, baseOptions });
		expect(restorer.restore('missing')).toBeUndefined();
	});

	it('restores a session with empty action log', () => {
		const { baseOptions } = createTestSetup();
		const restorer = new SessionRestorer({ persistence, baseOptions });

		// Create a minimal persisted session
		const data: PersistedSessionData = {
			sessionId: 'session-1',
			creationOptions: { devMode: false },
			actionLog: [],
			lastSnapshot: {} as PersistedSessionData['lastSnapshot'],
			registries: {} as PersistedSessionData['registries'],
			metadata: {} as PersistedSessionData['metadata'],
			lastAccessedAt: Date.now(),
			createdAt: Date.now() - 1000,
		};
		persistence.save(data);

		const restored = restorer.restore('session-1');
		expect(restored).toBeDefined();
		expect(restored?.createdAt).toBe(data.createdAt);
		expect(restored?.actionLog).toEqual([]);
		expect(restored?.session).toBeDefined();
	});

	it('restores a session with devMode enabled', () => {
		const { baseOptions } = createTestSetup();
		const restorer = new SessionRestorer({ persistence, baseOptions });

		const data: PersistedSessionData = {
			sessionId: 'session-dev',
			creationOptions: { devMode: true },
			actionLog: [],
			lastSnapshot: {} as PersistedSessionData['lastSnapshot'],
			registries: {} as PersistedSessionData['registries'],
			metadata: {} as PersistedSessionData['metadata'],
			lastAccessedAt: Date.now(),
			createdAt: Date.now(),
		};
		persistence.save(data);

		const restored = restorer.restore('session-dev');
		expect(restored).toBeDefined();
		const snapshot = restored?.session.getSnapshot();
		expect(snapshot?.game.devMode).toBe(true);
	});

	it('replays action log entries', () => {
		const { baseOptions, actionId, gainResourceId } = createTestSetup();
		const restorer = new SessionRestorer({ persistence, baseOptions });

		const data: PersistedSessionData = {
			sessionId: 'session-replay',
			creationOptions: { devMode: false },
			actionLog: [
				{ type: 'action', actionId },
				{ type: 'action', actionId },
			],
			lastSnapshot: {} as PersistedSessionData['lastSnapshot'],
			registries: {} as PersistedSessionData['registries'],
			metadata: {} as PersistedSessionData['metadata'],
			lastAccessedAt: Date.now(),
			createdAt: Date.now(),
		};
		persistence.save(data);

		const restored = restorer.restore('session-replay');
		expect(restored).toBeDefined();

		const snapshot = restored?.session.getSnapshot();
		const player = snapshot?.game.players[0];
		// Each action adds 1 to gainResourceId, so after 2 actions we should have 2
		expect(player?.values[gainResourceId]).toBe(2);
	});

	it('replays player name changes', () => {
		const { baseOptions } = createTestSetup();
		const restorer = new SessionRestorer({ persistence, baseOptions });

		const data: PersistedSessionData = {
			sessionId: 'session-names',
			creationOptions: { devMode: false },
			actionLog: [{ type: 'player-name', playerId: 'A', name: 'Alice' }],
			lastSnapshot: {} as PersistedSessionData['lastSnapshot'],
			registries: {} as PersistedSessionData['registries'],
			metadata: {} as PersistedSessionData['metadata'],
			lastAccessedAt: Date.now(),
			createdAt: Date.now(),
		};
		persistence.save(data);

		const restored = restorer.restore('session-names');
		expect(restored).toBeDefined();

		const snapshot = restored?.session.getSnapshot();
		const player = snapshot?.game.players.find(
			(candidate) => candidate.id === 'A',
		);
		expect(player?.name).toBe('Alice');
	});

	it('replays dev mode changes', () => {
		const { baseOptions } = createTestSetup();
		const restorer = new SessionRestorer({ persistence, baseOptions });

		const data: PersistedSessionData = {
			sessionId: 'session-devmode',
			creationOptions: { devMode: false },
			actionLog: [{ type: 'dev-mode', enabled: true }],
			lastSnapshot: {} as PersistedSessionData['lastSnapshot'],
			registries: {} as PersistedSessionData['registries'],
			metadata: {} as PersistedSessionData['metadata'],
			lastAccessedAt: Date.now(),
			createdAt: Date.now(),
		};
		persistence.save(data);

		const restored = restorer.restore('session-devmode');
		expect(restored).toBeDefined();

		const snapshot = restored?.session.getSnapshot();
		expect(snapshot?.game.devMode).toBe(true);
	});

	it('applies player names from creation options', () => {
		const { baseOptions } = createTestSetup();
		const restorer = new SessionRestorer({ persistence, baseOptions });

		const data: PersistedSessionData = {
			sessionId: 'session-initial-names',
			creationOptions: {
				devMode: false,
				playerNames: { A: 'Bob', B: 'Carol' },
			},
			actionLog: [],
			lastSnapshot: {} as PersistedSessionData['lastSnapshot'],
			registries: {} as PersistedSessionData['registries'],
			metadata: {} as PersistedSessionData['metadata'],
			lastAccessedAt: Date.now(),
			createdAt: Date.now(),
		};
		persistence.save(data);

		const restored = restorer.restore('session-initial-names');
		expect(restored).toBeDefined();

		const snapshot = restored?.session.getSnapshot();
		const playerA = snapshot?.game.players.find(
			(candidate) => candidate.id === 'A',
		);
		const playerB = snapshot?.game.players.find(
			(candidate) => candidate.id === 'B',
		);
		expect(playerA?.name).toBe('Bob');
		expect(playerB?.name).toBe('Carol');
	});

	it('returns the original action log for continued recording', () => {
		const { baseOptions, actionId } = createTestSetup();
		const restorer = new SessionRestorer({ persistence, baseOptions });

		const originalLog = [
			{ type: 'action' as const, actionId },
			{ type: 'advance' as const },
		];

		const data: PersistedSessionData = {
			sessionId: 'session-log',
			creationOptions: { devMode: false },
			actionLog: originalLog,
			lastSnapshot: {} as PersistedSessionData['lastSnapshot'],
			registries: {} as PersistedSessionData['registries'],
			metadata: {} as PersistedSessionData['metadata'],
			lastAccessedAt: Date.now(),
			createdAt: Date.now(),
		};
		persistence.save(data);

		const restored = restorer.restore('session-log');
		expect(restored?.actionLog).toEqual(originalLog);
	});
});
