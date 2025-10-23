import { describe, it, expect, vi } from 'vitest';
import {
	createEngineSession,
	createLocalSessionGateway,
} from '../../src/index.ts';
import type { EngineSession } from '../../src/runtime/session.ts';
import {
	createContentFactory,
	toSessionActionCategoryConfig,
} from '@kingdom-builder/testing';
import type {
	StartConfig,
	RuleSet,
	SessionRegistriesPayload,
} from '@kingdom-builder/protocol';
import type { PhaseDef } from '../../src/phases.ts';
import { REQUIREMENTS } from '../../src/requirements/index.ts';

const RESOURCE_AP = 'test:resource:ap';
const RESOURCE_GOLD = 'test:resource:gold';
const PHASE_MAIN = 'test:phase:main';
const STEP_MAIN = 'test:step:main';

const FAILURE_REQUIREMENT_ID = 'vitest:fail';
const FAILURE_MESSAGE = 'Requirement failed for gateway test';

if (!REQUIREMENTS.has(FAILURE_REQUIREMENT_ID)) {
	REQUIREMENTS.add(FAILURE_REQUIREMENT_ID, (requirement) => ({
		requirement,
		message: requirement.message ?? FAILURE_MESSAGE,
	}));
}

const PHASES: PhaseDef[] = [
	{
		id: PHASE_MAIN,
		action: true,
		steps: [{ id: STEP_MAIN }],
	},
];

const START: StartConfig = {
	player: {
		resources: {
			[RESOURCE_AP]: 3,
			[RESOURCE_GOLD]: 0,
		},
		stats: {},
		population: {},
		lands: [],
	},
};

const RULES: RuleSet = {
	defaultActionAPCost: 1,
	absorptionCapPct: 1,
	absorptionRounding: 'down',
	tieredResourceKey: RESOURCE_GOLD,
	tierDefinitions: [
		{
			id: 'test:tier:baseline',
			range: { min: 0 },
			effect: { incomeMultiplier: 1 },
		},
	],
	slotsPerNewLand: 1,
	maxSlotsPerLand: 1,
	basePopulationCap: 5,
	winConditions: [],
};

type GatewayOptions = Parameters<typeof createLocalSessionGateway>[1];

function createGateway(options?: GatewayOptions) {
	const content = createContentFactory();
	const gainGold = content.action({
		baseCosts: { [RESOURCE_AP]: 1 },
		effects: [
			{
				type: 'resource',
				method: 'add',
				params: { key: RESOURCE_GOLD, amount: 2 },
			},
		],
	});
	const failingAction = content.action({
		baseCosts: { [RESOURCE_AP]: 1 },
		requirements: [
			{
				type: 'vitest',
				method: 'fail',
				message: FAILURE_MESSAGE,
			},
		],
	});
	const session = createEngineSession({
		actions: content.actions,
		buildings: content.buildings,
		developments: content.developments,
		populations: content.populations,
		phases: PHASES,
		start: START,
		rules: RULES,
	});
	return {
		session,
		gateway: createLocalSessionGateway(session, options),
		actionIds: {
			gainGold: gainGold.id,
			failing: failingAction.id,
		},
	};
}

describe('createLocalSessionGateway', () => {
	it('creates sessions without leaking snapshots', async () => {
		const { gateway } = createGateway();
		const created = await gateway.createSession({
			devMode: true,
			playerNames: { A: 'Hero' },
		});
		expect(created.sessionId).toBe('local-session');
		expect(created.snapshot.game.devMode).toBe(true);
		expect(created.snapshot.game.players[0]?.name).toBe('Hero');
		expect(created.registries.actionCategories).toEqual({});
		const category = toSessionActionCategoryConfig(
			createContentFactory().category(),
		);
		created.registries.actionCategories![category.id] = category;
		created.snapshot.game.players[0]!.name = 'Mutated';
		created.snapshot.game.players[0]!.resources[RESOURCE_GOLD] = 99;
		const fetched = await gateway.fetchSnapshot({
			sessionId: created.sessionId,
		});
		expect(fetched.snapshot.game.players[0]?.name).toBe('Hero');
		expect(fetched.snapshot.game.players[0]?.resources[RESOURCE_GOLD]).toBe(0);
		expect(fetched.registries.actionCategories).toEqual({});
	});

	it('performs actions and clones response payloads', async () => {
		const { gateway, actionIds } = createGateway();
		const { sessionId } = await gateway.createSession();
		const response = await gateway.performAction({
			sessionId,
			actionId: actionIds.gainGold,
		});
		if (response.status !== 'success') {
			throw new Error('Expected action to succeed');
		}
		response.snapshot.game.players[0]!.resources[RESOURCE_GOLD] = 77;
		const firstTrace = response.traces[0];
		if (firstTrace) {
			firstTrace.after.resources[RESOURCE_GOLD] = 88;
		}
		const refreshed = await gateway.fetchSnapshot({ sessionId });
		expect(refreshed.snapshot.game.players[0]?.resources[RESOURCE_GOLD]).toBe(
			2,
		);
	});

	it('returns requirement failures from the engine session', async () => {
		const { gateway, actionIds } = createGateway();
		const { sessionId } = await gateway.createSession();
		const response = await gateway.performAction({
			sessionId,
			actionId: actionIds.failing,
		});
		expect(response.status).toBe('error');
		if (response.status === 'error') {
			expect(response.error).toBe(FAILURE_MESSAGE);
			expect(response.requirementFailure?.message).toBe(FAILURE_MESSAGE);
		}
		const refreshed = await gateway.fetchSnapshot({ sessionId });
		expect(refreshed.snapshot.game.players[0]?.resources[RESOURCE_GOLD]).toBe(
			0,
		);
	});

	it('advances phases while keeping responses isolated', async () => {
		const { gateway } = createGateway();
		const { sessionId } = await gateway.createSession();
		const advanced = await gateway.advancePhase({ sessionId });
		expect(advanced.advance.phase).toBe(PHASE_MAIN);
		advanced.advance.player.resources[RESOURCE_GOLD] = 45;
		advanced.snapshot.game.players[0]!.resources[RESOURCE_GOLD] = 64;
		const refreshed = await gateway.fetchSnapshot({ sessionId });
		expect(refreshed.snapshot.game.players[0]?.resources[RESOURCE_GOLD]).toBe(
			0,
		);
	});

	it('sets developer mode without leaking snapshot references', async () => {
		const { gateway } = createGateway();
		const { sessionId } = await gateway.createSession();
		const enabled = await gateway.setDevMode({
			sessionId,
			enabled: true,
		});
		expect(enabled.snapshot.game.devMode).toBe(true);
		enabled.snapshot.game.devMode = false;
		const refreshed = await gateway.fetchSnapshot({ sessionId });
		expect(refreshed.snapshot.game.devMode).toBe(true);
	});

	it('clones provided action category registries when supplied', async () => {
		const categoryFactory = createContentFactory();
		const providedCategory = toSessionActionCategoryConfig(
			categoryFactory.category(),
		);
		const registries: SessionRegistriesPayload = {
			actions: {},
			buildings: {},
			developments: {},
			populations: {},
			resources: {},
			actionCategories: {
				[providedCategory.id]: providedCategory,
			},
		};
		const { gateway } = createGateway({ registries });
		const created = await gateway.createSession();
		expect(created.registries.actionCategories).toEqual({
			[providedCategory.id]: providedCategory,
		});
		delete created.registries.actionCategories![providedCategory.id];
		const fetched = await gateway.fetchSnapshot({
			sessionId: created.sessionId,
		});
		expect(fetched.registries.actionCategories).toEqual({
			[providedCategory.id]: providedCategory,
		});
	});

	it('rejects requests targeting unknown sessions', async () => {
		const { gateway } = createGateway();
		const created = await gateway.createSession();
		expect(() =>
			gateway.fetchSnapshot({
				sessionId: `${created.sessionId}-mismatch`,
			}),
		).toThrowError(/Unknown session/);
	});

	it('uses manual registry cloning when structuredClone is unavailable', async () => {
		const content = createContentFactory();
		const providedCategory = toSessionActionCategoryConfig(content.category());
		const syntheticAction = content.action();
		const registries: SessionRegistriesPayload = {
			actions: {},
			buildings: {},
			developments: {},
			populations: {},
			resources: {},
			actionCategories: {
				[providedCategory.id]: providedCategory,
			},
		};
		const snapshot = {
			game: { players: [], devMode: false },
			registries: {},
			metadata: {},
			recentResourceGains: [],
			recentStatGains: [],
			recentPassiveRegistrations: [],
		} as unknown;
		const stubSession = {
			setDevMode: vi.fn(),
			updatePlayerName: vi.fn(),
			getSnapshot: vi.fn().mockReturnValue(snapshot),
			advancePhase: vi.fn(),
			getActionCosts: vi.fn(),
			performAction: vi.fn(),
			simulateUpcomingPhases: vi.fn(),
			runAiTurn: vi.fn(),
		} as unknown as EngineSession;
		const gateway = createLocalSessionGateway(stubSession, {
			sessionId: 'manual-session',
			registries,
		});
		const created = await gateway.createSession();
		expect(created.sessionId).toBe('manual-session');
		expect(created.registries).toEqual(registries);
		const original = globalThis.structuredClone;
		vi.stubGlobal('structuredClone', undefined as never);
		try {
			created.registries.actions[syntheticAction.id] = {
				id: syntheticAction.id,
			} as never;
			const fetched = await gateway.fetchSnapshot({
				sessionId: 'manual-session',
			});
			expect(fetched.registries).toEqual(registries);
		} finally {
			vi.unstubAllGlobals();
			expect(globalThis.structuredClone).toBe(original);
		}
	});

	it('filters non-numeric resource costs when performing actions', async () => {
		const { gateway, actionIds, session } = createGateway();
		const { sessionId } = await gateway.createSession();
		const costs = {
			[RESOURCE_AP]: 2,
			invalid: null,
		} as Record<string, number | null>;
		const costSpy = vi
			.spyOn(session, 'getActionCosts')
			.mockReturnValue(costs as never);
		const performSpy = vi.spyOn(session, 'performAction').mockReturnValue([]);
		const response = await gateway.performAction({
			sessionId,
			actionId: actionIds.gainGold,
		});
		expect(response.status).toBe('success');
		if (response.status === 'success') {
			expect(response.costs).toEqual({
				[RESOURCE_AP]: 2,
			});
		}
		expect(costSpy).toHaveBeenCalled();
		expect(performSpy).toHaveBeenCalledWith(actionIds.gainGold, undefined);
		vi.restoreAllMocks();
	});
});
