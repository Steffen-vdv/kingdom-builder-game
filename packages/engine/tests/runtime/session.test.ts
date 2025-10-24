import { describe, it, expect, vi } from 'vitest';
import { createEngineSession, type EngineSession } from '../../src/index.ts';
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
import { createContentFactory } from '@kingdom-builder/testing';
import { LandMethods } from '@kingdom-builder/contents/config/builderShared';
import { REQUIREMENTS } from '../../src/requirements/index.ts';
import { TAX_ACTION_ID, type PerformActionFn } from '../../src/ai/index.ts';

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

type EngineOverrides = Partial<typeof BASE> & { rules?: RuleSet };

function createTestSession(overrides: EngineOverrides = {}) {
	const { rules, ...rest } = overrides;
	return createEngineSession({
		actions: rest.actions ?? BASE.actions,
		buildings: rest.buildings ?? BASE.buildings,
		developments: rest.developments ?? BASE.developments,
		populations: rest.populations ?? BASE.populations,
		phases: rest.phases ?? BASE.phases,
		start: rest.start ?? BASE.start,
		rules: rules ?? RULES,
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

function advanceToPlayerMain(session: EngineSession, playerId: string) {
	const limit = BASE.phases.length * 20;
	for (let step = 0; step < limit; step += 1) {
		const snapshot = session.getSnapshot();
		if (
			snapshot.game.currentPhase === PhaseId.Main &&
			snapshot.game.activePlayerId === playerId
		) {
			return;
		}
		session.advancePhase();
	}
	throw new Error(`Failed to reach main phase for ${playerId}`);
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

	it('summarizes action definitions with optional system flags', () => {
		const content = createContentFactory();
		const categorized = content.action({
			system: true,
		});
		const session = createTestSession({
			actions: content.actions,
			buildings: content.buildings,
			developments: content.developments,
			populations: content.populations,
		});
		const definition = session.getActionDefinition(categorized.id);
		expect(definition).toEqual({
			id: categorized.id,
			name: categorized.name,
			system: true,
		});
	});

	it('throws for unknown action definitions', () => {
		const session = createTestSession();
		const missingAction = createContentFactory().action();
		expect(() => session.getActionDefinition(missingAction.id)).toThrowError(
			/Unknown id/,
		);
	});

	it('returns undefined when pulling an unknown effect log key', () => {
		const session = createTestSession();
		expect(session.pullEffectLog('missing:log')).toBeUndefined();
	});

	it('allows toggling developer mode directly on the session', () => {
		const session = createTestSession();
		expect(session.getSnapshot().game.devMode).toBe(false);
		session.setDevMode(true);
		expect(session.getSnapshot().game.devMode).toBe(true);
	});

	it('runs AI turns with dependency overrides and reports success', async () => {
		const session = createTestSession();
		const snapshot = session.getSnapshot();
		const aiPlayer = snapshot.game.players[1];
		if (!aiPlayer) {
			throw new Error('Expected an AI-controlled player.');
		}
		const ranTurn = await session.runAiTurn(aiPlayer.id, {
			performAction(actionId, engineContext) {
				const resourceKey = engineContext.actionCostResource;
				if (resourceKey) {
					engineContext.activePlayer.resources[resourceKey] = 0;
				}
				return undefined;
			},
			continueAfterAction() {
				return false;
			},
			shouldAdvancePhase() {
				return false;
			},
		});
		expect(ranTurn).toBe(true);
	});

	it('returns false when no AI controller is registered for a player', async () => {
		const session = createTestSession();
		expect(session.hasAiController('A')).toBe(false);
		await expect(session.runAiTurn('A')).resolves.toBe(false);
	});

	it('runs enqueued tasks in order', async () => {
		const session = createTestSession();
		const order: number[] = [];
		const first = session.enqueue(async () => {
			order.push(1);
			await Promise.resolve();
			return 'first';
		});
		const second = session.enqueue(() => {
			order.push(2);
			return 'second';
		});
		await expect(first).resolves.toBe('first');
		await expect(second).resolves.toBe('second');
		expect(order).toEqual([1, 2]);
	});

	it('returns cloned simulation results for upcoming phases', () => {
		const session = createTestSession();
		const snapshot = session.getSnapshot();
		const activeId = snapshot.game.activePlayerId;
		const result = session.simulateUpcomingPhases(activeId);
		expect(result.steps.length).toBeGreaterThan(0);
		const firstStep = result.steps[0];
		if (!firstStep) {
			throw new Error('Expected at least one simulation step.');
		}
		firstStep.player.resources[CResource.gold] = 999;
		const refreshed = session.simulateUpcomingPhases(activeId);
		expect(refreshed.steps[0]?.player.resources[CResource.gold]).not.toBe(999);
	});

	it('supports primitive effect log entries without mutation', () => {
		const session = createTestSession();
		session.pushEffectLog('test:primitive', 42);
		expect(session.pullEffectLog<number>('test:primitive')).toBe(42);
	});
});

it('toggles developer mode without leaking mutable snapshots', () => {
	const session = createTestSession();
	const initial = session.getSnapshot();
	expect(initial.game.devMode).toBe(false);
	session.setDevMode(true);
	const enabled = session.getSnapshot();
	expect(enabled.game.devMode).toBe(true);
	enabled.game.devMode = false;
	expect(session.getSnapshot().game.devMode).toBe(true);
	session.setDevMode(false);
	expect(session.getSnapshot().game.devMode).toBe(false);
});

it('updates player names only when ids match existing entries', () => {
	const session = createTestSession();
	const first = session.getSnapshot().game.players[0]!;
	const originalName = first.name;
	const renamed = `${originalName}-renamed`;
	session.updatePlayerName(first.id, renamed);
	const afterRename = session.getSnapshot();
	expect(afterRename.game.players[0]!.name).toBe(renamed);
	const missingId = `${first.id}-missing`;
	session.updatePlayerName(missingId, 'ignored');
	expect(session.getSnapshot().game.players[0]!.name).toBe(renamed);
});

it('returns cloned rule snapshots for tier definitions and win conditions', () => {
	const customRules = structuredClone(RULES);
	const session = createTestSession({ rules: customRules });
	const snapshot = session.getRuleSnapshot();
	const tierId = snapshot.tierDefinitions[0]?.id;
	if (!tierId) {
		throw new Error('Expected at least one tier definition');
	}
	snapshot.tierDefinitions[0]!.id = `${tierId}-mutated`;
	if (snapshot.winConditions.length === 0) {
		throw new Error('Expected at least one win condition');
	}
	snapshot.winConditions[0]!.result.subject = 'defeat';
	const refreshed = session.getRuleSnapshot();
	expect(refreshed.tierDefinitions[0]!.id).toBe(
		customRules.tierDefinitions[0]!.id,
	);
	expect(refreshed.winConditions[0]!.result.subject).toBe(
		customRules.winConditions[0]!.result.subject,
	);
});

it('returns cloned simulation previews for upcoming phases', () => {
	const session = createTestSession();
	const activeId = session.getSnapshot().game.activePlayerId;
	const preview = session.simulateUpcomingPhases(activeId);
	preview.steps.length = 0;
	preview.delta.resources.extra = 99;
	preview.before.resources = {};
	const refreshed = session.simulateUpcomingPhases(activeId);
	expect(refreshed.steps.length).toBeGreaterThan(0);
	expect(refreshed.delta.resources.extra).toBeUndefined();
	expect(Object.keys(refreshed.before.resources).length).toBeGreaterThan(0);
});

it('delegates AI turns with overrides while preserving controllers', async () => {
	const content = createContentFactory();
	const taxAction = content.action({
		id: TAX_ACTION_ID,
		baseCosts: { [CResource.ap]: 1 },
		effects: [
			{
				type: 'resource',
				method: 'add',
				params: { key: CResource.gold, amount: 1 },
			},
		],
	});
	void taxAction;
	const session = createTestSession({
		actions: content.actions,
		buildings: content.buildings,
		developments: content.developments,
		populations: content.populations,
	});
	const initial = session.getSnapshot();
	const opponentId = initial.game.opponentId;
	const activeId = initial.game.activePlayerId;
	expect(session.hasAiController(opponentId)).toBe(true);
	expect(session.hasAiController(activeId)).toBe(false);
	advanceToPlayerMain(session, opponentId);
	session.applyDeveloperPreset({
		playerId: opponentId,
		resources: [{ key: CResource.ap, target: 1 }],
	});
	const performSpy = vi.fn<
		Parameters<PerformActionFn>,
		ReturnType<PerformActionFn>
	>((actionId, engineContext) => {
		const apKey = engineContext.actionCostResource;
		const current = engineContext.activePlayer.resources[apKey] ?? 0;
		engineContext.activePlayer.resources[apKey] = Math.max(0, current - 1);
		return [];
	});
	const continueAfterAction = vi.fn().mockResolvedValue(true);
	const shouldAdvancePhase = vi.fn().mockResolvedValue(false);
	const advanceOverride = vi.fn();
	const result = await session.runAiTurn(opponentId, {
		performAction: performSpy,
		advance: advanceOverride,
		continueAfterAction,
		shouldAdvancePhase,
	});
	expect(result).toBe(true);
	expect(performSpy).toHaveBeenCalledTimes(1);
	expect(continueAfterAction).toHaveBeenCalledTimes(1);
	expect(shouldAdvancePhase).toHaveBeenCalledTimes(1);
	expect(advanceOverride).not.toHaveBeenCalled();
	const inactiveResult = await session.runAiTurn(activeId);
	expect(inactiveResult).toBe(false);
});
