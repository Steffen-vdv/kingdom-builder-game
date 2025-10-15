import { describe, it, expect } from 'vitest';
import {
	createEngineSession,
	type EngineSession,
	type EngineRegistryMetadataSources,
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
	RESOURCES,
	STATS,
	TRIGGER_INFO,
	LAND_INFO,
	SLOT_INFO,
	PASSIVE_INFO,
	OVERVIEW_CONTENT,
} from '@kingdom-builder/contents';
import type {
	ActionConfig as ActionDef,
	BuildingConfig as BuildingDef,
	DevelopmentConfig as DevelopmentDef,
	PopulationConfig as PopulationDef,
	Registry,
	StartConfig,
	SessionMetadataDescriptor,
	SessionTriggerMetadata,
} from '@kingdom-builder/protocol';
import type { PhaseDef } from '../../src/phases.ts';
import type { RuleSet } from '../../src/services';
import { createContentFactory } from '@kingdom-builder/testing';
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

type EngineOverrides = Partial<typeof BASE> & { rules?: RuleSet };

function createMetadataSources(): EngineRegistryMetadataSources {
	const resources = Object.values(RESOURCES).reduce<
		Record<string, SessionMetadataDescriptor>
	>((acc, info) => {
		if (!info) {
			return acc;
		}
		const descriptor: SessionMetadataDescriptor = {
			label: info.label,
		};
		if (info.icon !== undefined) {
			descriptor.icon = info.icon;
		}
		if (info.description !== undefined) {
			descriptor.description = info.description;
		}
		acc[info.key] = descriptor;
		return acc;
	}, {});
	const stats = Object.entries(STATS).reduce<
		Record<string, SessionMetadataDescriptor>
	>((acc, [key, info]) => {
		if (!info) {
			return acc;
		}
		const descriptor: SessionMetadataDescriptor = {
			label: info.label,
		};
		if (info.icon !== undefined) {
			descriptor.icon = info.icon;
		}
		if (info.description !== undefined) {
			descriptor.description = info.description;
		}
		acc[key] = descriptor;
		return acc;
	}, {});
	const triggers = Object.entries(TRIGGER_INFO).reduce<
		Record<string, SessionTriggerMetadata>
	>((acc, [key, info]) => {
		if (!info) {
			return acc;
		}
		const descriptor: SessionTriggerMetadata = {
			label: info.past ?? info.future ?? key,
		};
		if (info.icon !== undefined) {
			descriptor.icon = info.icon;
		}
		if (info.future !== undefined) {
			descriptor.future = info.future;
		}
		if (info.past !== undefined) {
			descriptor.past = info.past;
		}
		acc[key] = descriptor;
		return acc;
	}, {});
	const assets: Record<string, SessionMetadataDescriptor> = {
		land: { label: LAND_INFO.label, icon: LAND_INFO.icon },
		slot: { label: SLOT_INFO.label, icon: SLOT_INFO.icon },
		passive: { label: PASSIVE_INFO.label, icon: PASSIVE_INFO.icon },
	};
	return {
		resources,
		stats,
		triggers,
		assets,
		overviewContent: structuredClone(OVERVIEW_CONTENT),
	} satisfies EngineRegistryMetadataSources;
}

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
		metadataSources: createMetadataSources(),
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

	it('includes registry descriptors in snapshot metadata', () => {
		const session = createTestSession();
		const snapshot = session.getSnapshot();
		const { metadata } = snapshot;
		expect(Object.keys(metadata.resources)).not.toHaveLength(0);
		expect(Object.keys(metadata.populations)).not.toHaveLength(0);
		expect(Object.keys(metadata.buildings)).not.toHaveLength(0);
		expect(Object.keys(metadata.developments)).not.toHaveLength(0);
		expect(Object.keys(metadata.stats)).not.toHaveLength(0);
		expect(Object.keys(metadata.phases)).not.toHaveLength(0);
		expect(Object.keys(metadata.triggers)).not.toHaveLength(0);
		expect(metadata.assets.passive?.label).toBeDefined();
		expect(metadata.overviewContent.hero.title.length).toBeGreaterThan(0);
	});
});
