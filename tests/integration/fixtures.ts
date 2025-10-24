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
	Resource,
	type ResourceKey,
} from '@kingdom-builder/contents';
import type { EffectDef } from '@kingdom-builder/protocol';
import { PlayerState, Land } from '@kingdom-builder/engine/state';
import { runEffects } from '@kingdom-builder/engine/effects';
import {
	RESOURCE_V2_REGISTRY,
	RESOURCE_GROUP_V2_REGISTRY,
} from '@kingdom-builder/contents/registries/resourceV2';

const RESOURCE_CATALOG_V2 = Object.freeze({
	resources: RESOURCE_V2_REGISTRY,
	groups: RESOURCE_GROUP_V2_REGISTRY,
});

type EngineForTest = ReturnType<typeof createEngine>;

function deepClone<T>(value: T): T {
	return structuredClone(value);
}

function clonePlayer(player: PlayerState) {
	const copy = new PlayerState(player.id, player.name);
	copy.copyLegacyMappingsFrom(player);
	copy.resourceValues = deepClone(player.resourceValues);
	copy.resourceLowerBounds = deepClone(player.resourceLowerBounds);
	copy.resourceUpperBounds = deepClone(player.resourceUpperBounds);
	copy.resourceTouched = deepClone(player.resourceTouched);
	copy.resourceTierIds = deepClone(player.resourceTierIds);
	copy.resourceBoundTouched = deepClone(player.resourceBoundTouched);
	for (const key of Object.values(Resource)) {
		copy.resources[key] = player.resources[key];
	}
	copy.statsHistory = deepClone(player.statsHistory);
	for (const [statKey, value] of Object.entries(player.stats)) {
		copy.stats[statKey as keyof typeof player.stats] = value;
	}
	for (const [role, value] of Object.entries(player.population)) {
		copy.population[role as keyof typeof player.population] = value as number;
	}
	copy.lands = player.lands.map((landState) => {
		const newLand = new Land(landState.id, landState.slotsMax);
		newLand.slotsUsed = landState.slotsUsed;
		newLand.developments = [...landState.developments];
		if (landState.upkeep) {
			newLand.upkeep = { ...landState.upkeep };
		}
		if (landState.onPayUpkeepStep) {
			newLand.onPayUpkeepStep = landState.onPayUpkeepStep.map((effect) => ({
				...effect,
			}));
		}
		if (landState.onGainIncomeStep) {
			newLand.onGainIncomeStep = landState.onGainIncomeStep.map((effect) => ({
				...effect,
			}));
		}
		if (landState.onGainAPStep) {
			newLand.onGainAPStep = landState.onGainAPStep.map((effect) => ({
				...effect,
			}));
		}
		return newLand;
	});
	copy.buildings = new Set([...player.buildings]);
	copy.actions = new Set([...player.actions]);
	copy.statSources = deepClone(player.statSources);
	copy.skipPhases = deepClone(player.skipPhases);
	copy.skipSteps = deepClone(player.skipSteps);
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
		resourceCatalogV2: RESOURCE_CATALOG_V2,
	});
	if (overrides) {
		for (const key of Object.keys(RESOURCES) as (keyof typeof RESOURCES)[]) {
			const value = overrides[key];
			if (value !== undefined) {
				const resourceId = engineContext.activePlayer.getResourceV2Id(
					key as ResourceKey,
				);
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
	const resourceIds = new Set([
		...Object.keys(before.resourceValues),
		...Object.keys(dummy.resourceValues),
	]);
	for (const resourceId of resourceIds) {
		const delta =
			(dummy.resourceValues[resourceId] ?? 0) -
			(before.resourceValues[resourceId] ?? 0);
		if (delta !== 0) {
			valuesV2[resourceId] = delta;
		}
	}

	const land = dummy.lands.length - before.lands.length;
	return { valuesV2, land };
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

export function getBuildingWithStatBonuses() {
	for (const [id, def] of BUILDINGS.entries()) {
		const passive = findEffect(
			def.onBuild ?? [],
			(e) => e.type === 'passive' && e.method === 'add',
		);
		if (passive) {
			const stats = ((passive as { effects?: EffectDef[] }).effects || [])
				.filter(
					(e): e is EffectDef<{ key: string; amount: number }> =>
						e.type === 'stat' &&
						e.method === 'add' &&
						typeof (e.params as { key?: unknown }).key === 'string' &&
						typeof (e.params as { amount?: unknown }).amount === 'number',
				)
				.map((e) => ({
					key: (e.params as { key: string }).key,
					amount: (e.params as { amount: number }).amount,
				}));
			if (stats.length > 0) {
				return { buildingId: id, stats };
			}
		}
	}
	throw new Error('No building with stat bonuses found');
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
