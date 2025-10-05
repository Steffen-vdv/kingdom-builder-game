import { describe, it, expect } from 'vitest';
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
import { createContentFactory } from '../factories/content.ts';
import { REQUIREMENTS } from '../../src/requirements/index.ts';
import type { EvaluationModifier } from '../../src/services/passive_types.ts';

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
		const context = session.getLegacyContext();
		const entry = { detail: { amount: 7 } };
		context.pushEffectLog('test:log', entry);
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
		const context = session.getLegacyContext();
		const modifier: EvaluationModifier = () => ({ percent: 0.5 });
		context.passives.registerEvaluationModifier(
			'mod:test',
			'test:target',
			modifier,
		);
		const mods = session.getPassiveEvaluationMods();
		const original = context.passives.evaluationMods;
		expect(mods).not.toBe(original);
		const clonedInner = mods.get('test:target');
		const originalInner = original.get('test:target');
		expect(clonedInner).not.toBe(originalInner);
		if (!clonedInner || !originalInner) {
			throw new Error('Missing modifier buckets');
		}
		clonedInner.set('mod:other', () => ({ percent: 0 }));
		expect(originalInner.has('mod:other')).toBe(false);
		expect(originalInner.get('mod:test')).toBe(modifier);
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

	it('clones action requirement lookups from the session', () => {
		const requirementId = 'vitest:fail';
		const requirementMessage = 'Requirement failed for test';
		if (!REQUIREMENTS.has(requirementId)) {
			REQUIREMENTS.add(requirementId, () => requirementMessage);
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
		expect(requirements).toEqual([requirementMessage]);
		requirements.push('mutated');
		const refreshed = session.getActionRequirements(action.id);
		expect(refreshed).not.toBe(requirements);
		expect(refreshed).toEqual([requirementMessage]);
	});
});
