import { describe, it, expect } from 'vitest';
import {
	createEngineSession,
	loadResourceV2Registry,
	type EngineSession,
	type ResourceV2EngineRegistry,
} from '../../src/index.ts';
import {
	ACTIONS,
	BUILDINGS,
	DEVELOPMENTS,
	POPULATIONS,
	PHASES,
	PhaseId,
	GAME_START,
	RULES,
	Resource as CResource,
} from '@kingdom-builder/contents';
import type {
	ActionConfig as ActionDef,
	BuildingConfig as BuildingDef,
	DevelopmentConfig as DevelopmentDef,
	PopulationConfig as PopulationDef,
	Registry,
	StartConfig,
} from '@kingdom-builder/protocol';
import type { PhaseDef } from '../../src/phases.ts';
import type { RuleSet } from '../../src/services';
import {
	createContentFactory,
	createResourceV2Definition,
	createResourceV2Group,
} from '@kingdom-builder/testing';
import { LandMethods } from '@kingdom-builder/contents/config/builderShared';
import { REQUIREMENTS } from '../../src/requirements/index.ts';

const BASE: {
	actions: Registry<ActionDef>;
	buildings: Registry<BuildingDef>;
	developments: Registry<DevelopmentDef>;
	populations: Registry<PopulationDef>;
	phases: PhaseDef[];
	start: StartConfig;
} = {
	actions: ACTIONS,
	buildings: BUILDINGS,
	developments: DEVELOPMENTS,
	populations: POPULATIONS,
	phases: PHASES,
	start: GAME_START,
};

type EngineOverrides = Partial<typeof BASE> & {
	rules?: RuleSet;
	resourceV2Registry?: ResourceV2EngineRegistry;
};

function createTestSession(overrides: EngineOverrides = {}) {
	const { rules, resourceV2Registry, ...rest } = overrides;
	return createEngineSession({
		actions: rest.actions ?? BASE.actions,
		buildings: rest.buildings ?? BASE.buildings,
		developments: rest.developments ?? BASE.developments,
		populations: rest.populations ?? BASE.populations,
		phases: rest.phases ?? BASE.phases,
		start: rest.start ?? BASE.start,
		rules: rules ?? RULES,
		resourceV2Registry,
	});
}

function advanceToMain(session: EngineSession) {
	const limit = BASE.phases.length * 10;
	for (let step = 0; step < limit; step += 1) {
		const snapshot = session.getSnapshot();
		if (snapshot.game.currentPhase === PhaseId.Main) {
			return;
		}
		session.advancePhase();
	}
	throw new Error('Failed to reach main phase');
}

describe('EngineSession', () => {
	it('performs actions without exposing the context', () => {
		const content = createContentFactory();
		const gainGold = content.action({
			effects: [
				{
					type: 'resource',
					method: 'add',
					params: { key: CResource.gold, amount: 3 },
				},
			],
		});
		const session = createTestSession({
			actions: content.actions,
			buildings: content.buildings,
			developments: content.developments,
			populations: content.populations,
		});
		advanceToMain(session);
		const before = session.getSnapshot();
		const activeBefore = before.game.players[0]!;
		const initialGold = activeBefore.resources[CResource.gold] ?? 0;
		const traces = session.performAction(gainGold.id);
		const after = session.getSnapshot();
		const activeAfter = after.game.players[0]!;
		expect(activeAfter.resources[CResource.gold]).toBe(initialGold + 3);
		if (traces.length > 0) {
			traces[0]!.after.resources[CResource.gold] = 999;
		}
		const refreshed = session.getSnapshot();
		const activeRefreshed = refreshed.game.players[0]!;
		expect(activeRefreshed.resources[CResource.gold]).toBe(initialGold + 3);
	});

	it('simulates actions before executing to avoid partial failures', () => {
		const content = createContentFactory();
		const failingAction = content.action({
			baseCosts: { [CResource.ap]: 1 },
			effects: Array.from({ length: 3 }, () => ({
				type: 'land',
				method: LandMethods.TILL,
			})),
		});
		const session = createTestSession({
			actions: content.actions,
			buildings: content.buildings,
			developments: content.developments,
			populations: content.populations,
		});
		advanceToMain(session);
		const before = session.getSnapshot();
		const activeBefore = before.game.players[0]!;
		const initialAp = activeBefore.resources[CResource.ap] ?? 0;

		expect(() => session.performAction(failingAction.id)).toThrow(
			/No tillable land available/,
		);

		const after = session.getSnapshot();
		const activeAfter = after.game.players[0]!;
		expect(activeAfter.resources[CResource.ap]).toBe(initialAp);
	});

	it('returns immutable game snapshots', () => {
		const session = createTestSession();
		const snapshot = session.getSnapshot();
		snapshot.game.players[0]!.resources[CResource.gold] = 999;
		const next = session.getSnapshot();
		expect(next.game.players[0]!.resources[CResource.gold]).not.toBe(999);
	});

	it('provides cloned advance results', () => {
		const session = createTestSession();
		const result = session.advancePhase();
		const playerId = result.player.id;
		const keys = Object.keys(result.player.resources);
		const firstKey = keys[0];
		if (firstKey) {
			result.player.resources[firstKey] = 777;
		}
		const snapshot = session.getSnapshot();
		const player = snapshot.game.players.find((entry) => entry.id === playerId);
		if (firstKey) {
			expect(player?.resources[firstKey]).not.toBe(777);
		}
	});

	it('clones action effect groups for option queries', () => {
		const session = createTestSession();
		const withGroup = ACTIONS.entries().find(([, def]) =>
			def.effects.some(
				(effect) =>
					typeof effect === 'object' && effect !== null && 'options' in effect,
			),
		);
		if (!withGroup) {
			throw new Error('Expected an action with effect groups');
		}
		const [actionId, definition] = withGroup;
		const groups = session.getActionOptions(actionId);
		expect(groups.length).toBeGreaterThan(0);
		const firstGroup = definition.effects.find(
			(effect) =>
				typeof effect === 'object' && effect !== null && 'options' in effect,
		);
		if (!firstGroup || !('options' in firstGroup)) {
			throw new Error('Missing group definition');
		}
		const originalOptionId = firstGroup.options[0]?.id;
		const mutableOption = groups[0]?.options[0];
		if (mutableOption) {
			mutableOption.id = 'mutated';
		}
		const refreshed = session.getActionOptions(actionId);
		expect(refreshed[0]?.options[0]?.id).toBe(originalOptionId);
	});

	it('clones effect log entries when pulled from the session', () => {
		const session = createTestSession();
		const entry = { detail: { amount: 7 } };
		session.pushEffectLog('test:log', entry);
		const pulled = session.pullEffectLog<typeof entry>('test:log');
		expect(pulled).not.toBe(entry);
		expect(pulled).toEqual(entry);
		if (pulled) {
			pulled.detail.amount = 99;
		}
		expect(entry.detail.amount).toBe(7);
	});

	it('includes ResourceV2 values in player snapshots', () => {
		const childId = 'resource:v2';
		const parentId = 'parent:v2';
		const childTierLow = 'tier:low';
		const childTierHigh = 'tier:high';
		const parentTierLow = 'parent-tier:low';
		const parentTierHigh = 'parent-tier:high';
		const resource = createResourceV2Definition({
			id: childId,
			group: { groupId: 'group:v2', order: 1 },
			tierTrack: (track) => {
				track.tierWith(childTierLow, (tier) => {
					tier.range(0, 10);
				});
				track.tierWith(childTierHigh, (tier) => {
					tier.range(10);
				});
			},
		});
		const group = createResourceV2Group({
			id: 'group:v2',
			children: [resource.id],
			parentId,
			parentTierTrack: (track) => {
				track.tierWith(parentTierLow, (tier) => {
					tier.range(0, 10);
				});
				track.tierWith(parentTierHigh, (tier) => {
					tier.range(10);
				});
			},
		});
		const registry = loadResourceV2Registry({
			resources: [resource],
			groups: [group],
		});
		const content = createContentFactory();
		const gain = content.action({
			effects: [
				{
					type: 'resource',
					method: 'add',
					params: {
						id: resource.id,
						amount: 7,
					},
					meta: { reconciliation: 'clamp' },
				},
			],
		});
		const gainWithTrace = content.action({
			effects: [
				{
					type: 'action',
					method: 'perform',
					params: { id: gain.id },
				},
			],
		});
		const start: StartConfig = JSON.parse(JSON.stringify(GAME_START));
		const startPlayer = start.player as StartConfig['player'] & {
			resourceV2?: Record<string, number>;
		};
		startPlayer.resourceV2 = { [resource.id]: 4 };

		const session = createTestSession({
			actions: content.actions,
			start,
			resourceV2Registry: registry,
		});

		const initial = session.getSnapshot();
		const player = initial.game.players[0]!;
		expect(player.values).toBeDefined();
		const values = player.values!;
		expect(Object.keys(values)).toEqual([childId, parentId]);
		const childValue = values[childId];
		const parentValue = values[parentId];
		expect(childValue?.amount).toBe(4);
		expect(childValue?.touched).toBe(false);
		expect(childValue?.recentGains).toEqual([]);
		expect(childValue?.parent?.id).toBe(parentId);
		expect(parentValue?.amount).toBe(4);
		expect(parentValue?.touched).toBe(false);
		expect(parentValue?.recentGains).toEqual([]);
		expect(parentValue?.parent).toBeUndefined();
		const trackId = `${childId}_tierTrack`;
		expect(childValue?.tier).toEqual({
			trackId,
			tierId: childTierLow,
			nextTierId: childTierHigh,
		});
		const parentTrackId = `${parentId}_tierTrack`;
		expect(parentValue?.tier).toEqual({
			trackId: parentTrackId,
			tierId: parentTierLow,
			nextTierId: parentTierHigh,
		});

		advanceToMain(session);
		const traces = session.performAction(gainWithTrace.id);
		expect(traces).toHaveLength(1);
		const firstTrace = traces[0]!;
		const beforeChild = firstTrace.before.values?.[childId];
		const afterChild = firstTrace.after.values?.[childId];
		expect(beforeChild?.amount).toBe(4);
		expect(beforeChild?.recentGains).toEqual([]);
		expect(afterChild?.amount).toBe(11);
		expect(afterChild?.recentGains).toEqual([
			{ resourceId: childId, delta: 7 },
		]);
		expect(afterChild?.touched).toBe(true);
		expect(afterChild?.tier).toEqual({
			trackId,
			tierId: childTierHigh,
			previousTierId: childTierLow,
		});

		const after = session.getSnapshot();
		const updated = after.game.players[0]!;
		const updatedValues = updated.values!;
		const updatedChild = updatedValues[childId];
		const updatedParent = updatedValues[parentId];
		expect(updatedChild?.amount).toBe(11);
		expect(updatedParent?.amount).toBe(11);
		expect(updatedParent?.touched).toBe(true);
		expect(updatedParent?.tier).toEqual({
			trackId: parentTrackId,
			tierId: parentTierHigh,
			previousTierId: parentTierLow,
		});
		expect(updatedChild?.recentGains).toEqual([
			{ resourceId: childId, delta: 7 },
		]);
		expect(updatedParent?.recentGains).toEqual([]);
		expect(after.recentResourceGains).toEqual(
			expect.arrayContaining([{ key: childId, amount: 7 }]),
		);
	});

	it('returns cloned passive evaluation modifier maps', () => {
		const session = createTestSession();
		const mods = session.getPassiveEvaluationMods();
		expect(mods.size).toBe(0);
		mods.set('test:target', new Map());
		const refreshed = session.getPassiveEvaluationMods();
		expect(refreshed).not.toBe(mods);
		expect(refreshed.has('test:target')).toBe(false);
	});

	it('clones action cost lookups from the session', () => {
		const content = createContentFactory();
		const goldCost = 5;
		const action = content.action({
			baseCosts: { [CResource.gold]: goldCost },
		});
		const session = createTestSession({
			actions: content.actions,
			buildings: content.buildings,
			developments: content.developments,
			populations: content.populations,
		});
		advanceToMain(session);
		const costs = session.getActionCosts(action.id);
		expect(costs[CResource.gold]).toBe(goldCost);
		costs[CResource.gold] = 999;
		const refreshed = session.getActionCosts(action.id);
		expect(refreshed).not.toBe(costs);
		expect(refreshed[CResource.gold]).toBe(goldCost);
	});

	it('unlocks non-system actions at session start', () => {
		const content = createContentFactory();
		const unlocked = content.action({ name: 'Unlocked Action' });
		const locked = content.action({
			name: 'Locked System',
			system: true,
		});
		const session = createTestSession({
			actions: content.actions,
			buildings: content.buildings,
			developments: content.developments,
			populations: content.populations,
		});
		const snapshot = session.getSnapshot();
		const [first, second] = snapshot.game.players;
		expect(first?.actions).toContain(unlocked.id);
		expect(second?.actions).toContain(unlocked.id);
		expect(first?.actions).not.toContain(locked.id);
		expect(second?.actions).not.toContain(locked.id);
	});

	it('clones action requirement lookups from the session', () => {
		const requirementId = 'vitest:fail';
		const requirementMessage = 'Requirement failed for test';
		if (!REQUIREMENTS.has(requirementId)) {
			REQUIREMENTS.add(requirementId, (requirement) => ({
				requirement,
				message: requirementMessage,
			}));
		}
		const content = createContentFactory();
		const action = content.action({
			requirements: [
				{
					type: 'vitest',
					method: 'fail',
					message: requirementMessage,
				},
			],
		});
		const session = createTestSession({
			actions: content.actions,
			buildings: content.buildings,
			developments: content.developments,
			populations: content.populations,
		});
		advanceToMain(session);
		const requirements = session.getActionRequirements(action.id);
		expect(requirements).toEqual([
			{
				requirement: expect.objectContaining({
					type: 'vitest',
					method: 'fail',
					message: requirementMessage,
				}),
				message: requirementMessage,
			},
		]);
		requirements.push(requirements[0]!);
		const refreshed = session.getActionRequirements(action.id);
		expect(refreshed).not.toBe(requirements);
		expect(refreshed).toEqual([
			{
				requirement: expect.objectContaining({
					type: 'vitest',
					method: 'fail',
					message: requirementMessage,
				}),
				message: requirementMessage,
			},
		]);
	});

	it('evaluates requirements for a specific player without changing turns', () => {
		const requirementId = 'vitest:active-id';
		if (!REQUIREMENTS.has(requirementId)) {
			REQUIREMENTS.add(requirementId, (requirement, context) => ({
				requirement,
				message: context.activePlayer.id,
			}));
		}
		const content = createContentFactory();
		const action = content.action({
			requirements: [
				{
					type: 'vitest',
					method: 'active-id',
				},
			],
		});
		const session = createTestSession({
			actions: content.actions,
			buildings: content.buildings,
			developments: content.developments,
			populations: content.populations,
		});
		advanceToMain(session);
		const initialSnapshot = session.getSnapshot();
		const initialActive = initialSnapshot.game.activePlayerId;
		const opponentId = initialSnapshot.game.opponentId;
		const defaultRequirements = session.getActionRequirements(action.id);
		expect(defaultRequirements[0]?.message).toBe(initialActive);
		const opponentRequirements = session.getActionRequirements(
			action.id,
			undefined,
			opponentId,
		);
		expect(opponentRequirements[0]?.message).toBe(opponentId);
		const afterSnapshot = session.getSnapshot();
		expect(afterSnapshot.game.activePlayerId).toBe(initialActive);
	});
});
