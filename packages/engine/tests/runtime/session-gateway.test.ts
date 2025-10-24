import { describe, it, expect } from 'vitest';
import {
	createEngineSession,
	createLocalSessionGateway,
} from '../../src/index.ts';
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
const PHASE_GROWTH = 'test:phase:growth';
const PHASE_UPKEEP = 'test:phase:upkeep';
const STEP_MAIN = 'test:step:main';
const STEP_GROWTH = 'test:step:growth';
const STEP_UPKEEP = 'test:step:upkeep';

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
		id: PHASE_GROWTH,
		steps: [{ id: STEP_GROWTH }],
	},
	{
		id: PHASE_MAIN,
		action: true,
		steps: [{ id: STEP_MAIN }],
	},
	{
		id: PHASE_UPKEEP,
		steps: [{ id: STEP_UPKEEP }],
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
	corePhaseIds: {
		growth: PHASE_GROWTH,
		upkeep: PHASE_UPKEEP,
	},
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
		expect(advanced.advance.phase).toBe(PHASE_GROWTH);
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

	it('ignores empty player name overrides and unknown identifiers', async () => {
		const { gateway } = createGateway();
		const created = await gateway.createSession({
			playerNames: { A: 'Hero', B: '' },
		});
		expect(created.snapshot.game.players[0]?.name).toBe('Hero');
		expect(created.snapshot.game.players[1]?.name).toBe('Opponent');
	});

	it('rejects requests that reference an unknown session id', async () => {
		const { gateway } = createGateway();
		await gateway.createSession();
		expect(() =>
			gateway.fetchSnapshot({ sessionId: 'unknown-session' }),
		).toThrowError('Unknown session: unknown-session');
	});

	it('provides costs, requirements, options, and simulations through the gateway', async () => {
		const { gateway, actionIds } = createGateway();
		const created = await gateway.createSession();
		const { sessionId } = created;
		const costResponse = await gateway.getActionCosts({
			sessionId,
			actionId: actionIds.gainGold,
		});
		expect(costResponse.costs[RESOURCE_AP]).toBe(1);
		const requirementResponse = await gateway.getActionRequirements({
			sessionId,
			actionId: actionIds.gainGold,
		});
		expect(requirementResponse.requirements).toEqual([]);
		const optionsResponse = await gateway.getActionOptions({
			sessionId,
			actionId: actionIds.gainGold,
		});
		expect(Array.isArray(optionsResponse.groups)).toBe(true);
		const simulationResponse = await gateway.simulateUpcomingPhases({
			sessionId,
			playerId: created.snapshot.game.activePlayerId,
		});
		expect(simulationResponse.result.steps.length).toBeGreaterThan(0);
	});

	it('runs AI turns through the gateway without leaking responses', async () => {
		const { gateway } = createGateway();
		const created = await gateway.createSession();
		const aiPlayer = created.snapshot.game.players[1];
		if (!aiPlayer) {
			throw new Error('Expected an AI-controlled player.');
		}
		const response = await gateway.runAiTurn({
			sessionId: created.sessionId,
			playerId: aiPlayer.id,
		});
		expect(response.ranTurn).toBe(true);
		response.snapshot.game.players[0]!.resources[RESOURCE_GOLD] = 999;
		const refreshed = await gateway.fetchSnapshot({
			sessionId: created.sessionId,
		});
		const baselineGold =
			created.snapshot.game.players[0]?.resources[RESOURCE_GOLD];
		expect(refreshed.snapshot.game.players[0]?.resources[RESOURCE_GOLD]).toBe(
			baselineGold,
		);
	});
});
