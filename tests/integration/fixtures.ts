import { createEngine, getActionCosts } from '@kingdom-builder/engine';
import { resolveActionEffects } from '@kingdom-builder/protocol';
import {
	ACTIONS,
	BUILDINGS,
	DEVELOPMENTS,
	POPULATIONS,
	PHASES,
	GAME_START,
	RULES,
	RESOURCES,
} from '@kingdom-builder/contents';
import {
	RESOURCE_V2_REGISTRY,
	RESOURCE_GROUP_V2_REGISTRY,
} from '@kingdom-builder/contents/registries/resourceV2';
import type { EffectDef } from '@kingdom-builder/protocol';
import { PlayerState, Land } from '@kingdom-builder/engine/state';
import { runEffects } from '@kingdom-builder/engine/effects';

type EngineForTest = ReturnType<typeof createEngine>;

function deepClone<T>(value: T): T {
	return structuredClone(value);
}

function clonePlayer(player: PlayerState) {
	const copy = new PlayerState(player.id, player.name);
	copy.resourceValues = deepClone(player.resourceValues);
	copy.resourceLowerBounds = deepClone(player.resourceLowerBounds);
	copy.resourceUpperBounds = deepClone(player.resourceUpperBounds);
	copy.resourceTouched = deepClone(player.resourceTouched);
	copy.resourceTierIds = deepClone(player.resourceTierIds);
	copy.resourceBoundTouched = deepClone(player.resourceBoundTouched);
	copy.resourceTouchedV2 = deepClone(player.resourceTouchedV2);
	copy.resourceSources = deepClone(player.resourceSources);
	copy.skipPhases = deepClone(player.skipPhases);
	copy.skipSteps = deepClone(player.skipSteps);
	copy.lands = player.lands.map((landState) => {
		const newLand = new Land(landState.id, landState.slotsMax);
		newLand.slotsUsed = landState.slotsUsed;
		newLand.developments = [...landState.developments];
		return newLand;
	});
	copy.buildings = new Set([...player.buildings]);
	copy.actions = new Set([...player.actions]);
	return copy;
}

export function createTestContext(
	overrides?: Partial<Record<keyof typeof RESOURCES, number>>,
) {
	const engineContext = createEngine({
		actions: ACTIONS,
		buildings: BUILDINGS,
		developments: DEVELOPMENTS,
		populations: POPULATIONS,
		phases: PHASES,
		start: GAME_START,
		rules: RULES,
		resourceCatalogV2: {
			resources: RESOURCE_V2_REGISTRY,
			groups: RESOURCE_GROUP_V2_REGISTRY,
		},
	});
	if (overrides) {
		for (const key of Object.keys(RESOURCES) as (keyof typeof RESOURCES)[]) {
			const value = overrides[key];
			if (value !== undefined) {
				// RESOURCES values are already ResourceV2 IDs (e.g., resource:core:gold)
				const resourceId = RESOURCES[key];
				engineContext.activePlayer.resourceValues[resourceId] = value;
			}
		}
	}
	return engineContext;
}

export function simulateEffects(
	effects: EffectDef[],
	engineContext: EngineForTest,
	actionId?: string,
) {
	const before = clonePlayer(engineContext.activePlayer);
	const dummy = clonePlayer(engineContext.activePlayer);
	const dummyCtx = { ...engineContext, activePlayer: dummy } as EngineForTest;
	runEffects(effects, dummyCtx);
	if (actionId) {
		engineContext.passives.runResultMods(actionId, dummyCtx);
	}

	const valuesV2: Record<string, number> = {};
	const beforeKeys = new Set(
		Object.keys(before.resourceValues).concat(
			Object.keys(dummy.resourceValues),
		),
	);
	for (const key of beforeKeys) {
		const delta =
			(dummy.resourceValues[key] ?? 0) - (before.resourceValues[key] ?? 0);
		if (delta !== 0) {
			valuesV2[key] = delta;
		}
	}

	// Derive legacy resources (resource:core:*) and stats (resource:stat:*)
	// from valuesV2 for backward compatibility
	const resources: Record<string, number> = {};
	const stats: Record<string, number> = {};
	for (const [key, delta] of Object.entries(valuesV2)) {
		if (key.startsWith('resource:core:')) {
			resources[key] = delta;
		} else if (key.startsWith('resource:stat:')) {
			stats[key] = delta;
		}
	}

	const land = dummy.lands.length - before.lands.length;
	return { resources, stats, valuesV2, land };
}

export function getActionOutcome(id: string, engineContext: EngineForTest) {
	const actionDefinition = engineContext.actions.get(id);
	const resolved = resolveActionEffects(actionDefinition);
	const costs = getActionCosts(id, engineContext);
	const results = simulateEffects(
		resolved.effects,
		engineContext,
		actionDefinition.id,
	);
	return { costs, results };
}

function findEffect(
	effects: EffectDef[],
	predicate: (e: EffectDef) => boolean,
): EffectDef | undefined {
	for (const effect of effects) {
		if (predicate(effect)) {
			return effect;
		}
		const nested =
			(effect as { effects?: EffectDef[] }).effects &&
			findEffect((effect as { effects?: EffectDef[] }).effects!, predicate);
		if (nested) {
			return nested;
		}
	}
	return undefined;
}

export function getBuildActionId(
	engineContext: EngineForTest,
	buildingId: string,
) {
	for (const [id, def] of engineContext.actions.entries()) {
		const effect = findEffect(
			def.effects,
			(e) => e.type === 'building' && e.method === 'add',
		);
		if (!effect) {
			continue;
		}
		const effectParams = effect.params as { id?: string } | undefined;
		if (effectParams?.id === buildingId) {
			return id;
		}
	}
	throw new Error(`No build action found for building id "${buildingId}"`);
}

export function getBuildingWithActionMods() {
	for (const [id, def] of BUILDINGS.entries()) {
		const mod = findEffect(
			def.onBuild ?? [],
			(e) =>
				(e.type === 'cost_mod' || e.type === 'result_mod') &&
				typeof (e.params as { actionId?: unknown }).actionId === 'string',
		);
		if (mod) {
			return {
				buildingId: id,
				actionId: (mod.params as { actionId: string }).actionId,
			};
		}
	}
	throw new Error('No building with action mods found');
}

export function getBuildingWithResourceBonuses() {
	for (const [id, def] of BUILDINGS.entries()) {
		const passive = findEffect(
			def.onBuild ?? [],
			(e) => e.type === 'passive' && e.method === 'add',
		);
		if (passive) {
			const passiveEffects =
				(passive as { effects?: EffectDef[] }).effects || [];
			// Look for ResourceV2 add effects
			const resources = passiveEffects
				.filter((e): e is EffectDef => {
					if (e.type !== 'resource' || e.method !== 'add') {
						return false;
					}
					const params = e.params as {
						resourceId?: string;
						change?: { type: string; amount?: number };
					};
					return (
						typeof params?.resourceId === 'string' &&
						params?.change?.type === 'amount' &&
						typeof params.change.amount === 'number'
					);
				})
				.map((e) => {
					const params = e.params as {
						resourceId: string;
						change: { amount: number };
					};
					return {
						key: params.resourceId,
						amount: params.change.amount,
					};
				});
			if (resources.length > 0) {
				return { buildingId: id, resources };
			}
		}
	}
	throw new Error('No building with resource bonuses found');
}

export function getActionWithMultipleCosts(engineContext: EngineForTest) {
	for (const [id] of engineContext.actions.entries()) {
		const costs = getActionCosts(id, engineContext);
		if (Object.keys(costs).length > 1) {
			return { actionId: id, costs };
		}
	}
	throw new Error('No action with multiple costs found');
}

export function getActionWithCost(engineContext: EngineForTest) {
	for (const [id] of engineContext.actions.entries()) {
		const costs = getActionCosts(id, engineContext);
		if (Object.keys(costs).length > 0) {
			return { actionId: id, costs };
		}
	}
	throw new Error('No action with costs found');
}
