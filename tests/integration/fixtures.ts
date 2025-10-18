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
import type { EffectDef } from '@kingdom-builder/protocol';
import { PlayerState, Land } from '@kingdom-builder/engine/state';
import { runEffects } from '@kingdom-builder/engine/effects';

type EngineForTest = ReturnType<typeof createEngine>;

function deepClone<T>(value: T): T {
	return structuredClone(value);
}

function clonePlayer(player: PlayerState) {
	const copy = new PlayerState(player.id, player.name);
	copy.resources = deepClone(player.resources);
	copy.stats = deepClone(player.stats);
	copy.population = deepClone(player.population);
	copy.lands = player.lands.map((landState) => {
		const newLand = new Land(landState.id, landState.slotsMax);
		newLand.slotsUsed = landState.slotsUsed;
		newLand.developments = [...landState.developments];
		return newLand;
	});
	copy.buildings = new Set([...player.buildings]);
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
	});
	if (overrides) {
		for (const key of Object.keys(RESOURCES) as (keyof typeof RESOURCES)[]) {
			const value = overrides[key];
			if (value !== undefined) {
				engineContext.activePlayer.resources[key] = value;
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

	const resources: Record<string, number> = {};
	for (const key of Object.keys(before.resources)) {
		const delta =
			dummy.resources[key as keyof typeof dummy.resources] -
			before.resources[key as keyof typeof before.resources];
		if (delta !== 0) {
			resources[key] = delta;
		}
	}

	const stats: Record<string, number> = {};
	for (const key of Object.keys(before.stats)) {
		const delta =
			dummy.stats[key as keyof typeof dummy.stats] -
			before.stats[key as keyof typeof before.stats];
		if (delta !== 0) {
			stats[key] = delta;
		}
	}

	const land = dummy.lands.length - before.lands.length;
	return { resources, stats, land };
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

export function getBuildActionId(engineContext: EngineForTest) {
	for (const [id, def] of engineContext.actions.entries()) {
		if (
			findEffect(
				def.effects,
				(e) => e.type === 'building' && e.method === 'add',
			)
		) {
			return id;
		}
	}
	throw new Error('No build action found');
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
