import { describe, it, expect } from 'vitest';
import {
	createEngineSession,
	createLocalSessionGateway,
} from '../../src/index.ts';
import {
	createContentFactory,
	toSessionActionCategoryConfig,
} from '@kingdom-builder/testing';
import { resourceAmountParams } from '../helpers/resourceV2Params.ts';
import {
	RESOURCE_V2_REGISTRY,
	RESOURCE_GROUP_V2_REGISTRY,
} from '@kingdom-builder/contents/registries/resourceV2';
import {
	Resource as CResource,
	PHASES as REAL_PHASES,
	RULES as REAL_RULES,
	PhaseId,
	ACTIONS as REAL_ACTIONS,
	BUILDINGS as REAL_BUILDINGS,
	DEVELOPMENTS as REAL_DEVELOPMENTS,
	POPULATIONS as REAL_POPULATIONS,
} from '@kingdom-builder/contents';
import type { SessionRegistriesPayload } from '@kingdom-builder/protocol';
import { REQUIREMENTS } from '../../src/requirements/index.ts';
import type { RuntimeResourceContent } from '../../src/resource-v2/index.ts';

// Use actual ResourceV2 IDs - they ARE the resource keys directly
const RESOURCE_AP = CResource.ap;
const RESOURCE_GOLD = CResource.gold;

const FAILURE_REQUIREMENT_ID = 'vitest:fail';
const FAILURE_MESSAGE = 'Requirement failed for gateway test';

if (!REQUIREMENTS.has(FAILURE_REQUIREMENT_ID)) {
	REQUIREMENTS.add(FAILURE_REQUIREMENT_ID, (requirement) => ({
		requirement,
		message: requirement.message ?? FAILURE_MESSAGE,
	}));
}

// Use real phases and rules from contents for proper initial setup integration

const BASE_RESOURCE_CATALOG: RuntimeResourceContent = {
	resources: RESOURCE_V2_REGISTRY,
	groups: RESOURCE_GROUP_V2_REGISTRY,
};

type GatewayOptions = Parameters<typeof createLocalSessionGateway>[1];

interface CreateGatewayOptions {
	gatewayOptions?: GatewayOptions;
	devMode?: boolean;
}

function createGateway(options?: CreateGatewayOptions) {
	const content = createContentFactory();
	// Add test-specific actions to the real ACTIONS registry
	const gainGold = content.action({
		effects: [
			{
				type: 'resource',
				method: 'add',
				params: resourceAmountParams({
					key: RESOURCE_GOLD,
					amount: 2,
				}),
			},
		],
	});
	const failingAction = content.action({
		requirements: [
			{
				type: 'vitest',
				method: 'fail',
				message: FAILURE_MESSAGE,
			},
		],
	});
	// Register test actions with the real ACTIONS registry
	REAL_ACTIONS.add(gainGold.id, gainGold);
	REAL_ACTIONS.add(failingAction.id, failingAction);

	const session = createEngineSession({
		actions: REAL_ACTIONS,
		buildings: REAL_BUILDINGS,
		developments: REAL_DEVELOPMENTS,
		populations: REAL_POPULATIONS,
		phases: REAL_PHASES,
		rules: REAL_RULES,
		resourceCatalogV2: BASE_RESOURCE_CATALOG,
		devMode: options?.devMode,
	});
	return {
		gateway: createLocalSessionGateway(session, options?.gatewayOptions),
		actionIds: {
			gainGold: gainGold.id,
			failing: failingAction.id,
		},
	};
}

describe('createLocalSessionGateway', () => {
	it('creates sessions without leaking snapshots', async () => {
		// Pass devMode during engine creation so devMode setup runs
		const { gateway } = createGateway({ devMode: true });
		const created = await gateway.createSession({
			devMode: true,
			playerNames: { A: 'Hero' },
		});
		expect(created.sessionId).toBe('local-session');
		expect(created.snapshot.game.devMode).toBe(true);
		expect(created.snapshot.game.players[0]?.name).toBe('Hero');
		expect(created.registries.actionCategories).toEqual({});
		expect(created.registries.resourcesV2).toEqual({});
		expect(created.registries.resourceGroupsV2).toEqual({});
		const firstPlayer = created.snapshot.game.players[0];
		expect(firstPlayer?.resources).toBeDefined();
		expect(firstPlayer?.valuesV2).toBeDefined();
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
		// Initial gold from devMode setup (100)
		expect(fetched.snapshot.game.players[0]?.resources[RESOURCE_GOLD]).toBe(
			100,
		);
		expect(fetched.registries.actionCategories).toEqual({});
	});

	it('clones registries including ResourceV2 payloads', async () => {
		const resourceId = RESOURCE_V2_REGISTRY.ordered[0]!.id;
		const groupId = RESOURCE_GROUP_V2_REGISTRY.ordered[0]!.id;
		const { gateway } = createGateway({
			gatewayOptions: {
				registries: {
					actions: {},
					buildings: {},
					developments: {},
					populations: {},
					resources: {},
					actionCategories: {},
					resourcesV2: {
						[resourceId]: RESOURCE_V2_REGISTRY.byId[resourceId]!,
					},
					resourceGroupsV2: {
						[groupId]: RESOURCE_GROUP_V2_REGISTRY.byId[groupId]!,
					},
				},
			},
		});
		const created = await gateway.createSession();
		const registries = created.registries;
		registries.resourcesV2[resourceId]!.label = 'Mutated gold';
		registries.resourceGroupsV2[groupId]!.label = 'Mutated group';
		const fetched = await gateway.fetchSnapshot({
			sessionId: created.sessionId,
		});
		expect(fetched.registries.resourcesV2[resourceId]?.label).not.toBe(
			'Mutated gold',
		);
		expect(fetched.registries.resourceGroupsV2[groupId]?.label).not.toBe(
			'Mutated group',
		);
	});

	it('performs actions and clones response payloads', async () => {
		const { gateway, actionIds } = createGateway();
		const { sessionId } = await gateway.createSession();
		// Advance to Main phase to get AP from council (during Growth phase)
		while (true) {
			const advanced = await gateway.advancePhase({ sessionId });
			// Check the snapshot's current phase, not the processed phase
			if (advanced.snapshot.game.currentPhase === PhaseId.Main) {
				break;
			}
		}
		const response = await gateway.performAction({
			sessionId,
			actionId: actionIds.gainGold,
		});
		if (response.status !== 'success') {
			throw new Error(
				`Expected action to succeed but got: ${response.error ?? 'unknown error'}`,
			);
		}
		response.snapshot.game.players[0]!.resources[RESOURCE_GOLD] = 77;
		const firstTrace = response.traces[0];
		if (firstTrace) {
			firstTrace.after.resources[RESOURCE_GOLD] = 88;
		}
		const refreshed = await gateway.fetchSnapshot({ sessionId });
		// Initial gold (10) + gained gold (2) = 12
		expect(refreshed.snapshot.game.players[0]?.resources[RESOURCE_GOLD]).toBe(
			12,
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
		// Player starts with 10 gold; failing action doesn't change it
		expect(refreshed.snapshot.game.players[0]?.resources[RESOURCE_GOLD]).toBe(
			10,
		);
	});

	it('advances phases while keeping responses isolated', async () => {
		const { gateway } = createGateway();
		const { sessionId } = await gateway.createSession();
		const advanced = await gateway.advancePhase({ sessionId });
		// advance.phase is the phase that was just processed (Growth)
		expect(advanced.advance.phase).toBe(PhaseId.Growth);
		advanced.advance.player.resources[RESOURCE_GOLD] = 45;
		advanced.snapshot.game.players[0]!.resources[RESOURCE_GOLD] = 64;
		const refreshed = await gateway.fetchSnapshot({ sessionId });
		// Player starts with 10 gold; first advance only processes step 1
		// of Growth (ResolveDynamicTriggers), not GainIncome where farm fires
		expect(refreshed.snapshot.game.players[0]?.resources[RESOURCE_GOLD]).toBe(
			10,
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
		const { gateway } = createGateway({ gatewayOptions: { registries } });
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
