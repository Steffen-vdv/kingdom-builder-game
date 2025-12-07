import { applyParamsToEffects } from '@kingdom-builder/protocol';
import type { EngineContext } from './context';
import type { EffectDef } from './effects';
import type { PlayerState } from './state';
import type { ResourceSourceFrame } from './resource_sources';
import { getResourceValue } from './resource';

export interface TriggerEffectBundle {
	effects: EffectDef[];
	frames?: ResourceSourceFrame | ResourceSourceFrame[];
}

function pushUpkeepEffect(
	bundles: TriggerEffectBundle[],
	_player: PlayerState,
	source: Record<string, unknown>,
	resourceId: string,
	amount: number,
) {
	// resourceId IS the Resource ID directly (no mapper needed)
	bundles.push({
		effects: [
			{
				type: 'resource',
				method: 'remove',
				params: {
					resourceId,
					change: { type: 'amount', amount },
				},
				meta: { source },
			},
		],
	});
}

function cloneEffect(effect: EffectDef): EffectDef {
	const cloned: EffectDef = { ...effect };
	if (effect.effects) {
		cloned.effects = effect.effects.map(cloneEffect);
	}
	return cloned;
}

function getEffects(
	definition: unknown,
	trigger: string,
): EffectDef[] | undefined {
	const value = (definition as Record<string, unknown>)[trigger];
	return Array.isArray(value) ? (value as EffectDef[]) : undefined;
}

export function collectTriggerEffects(
	trigger: string,
	engineContext: EngineContext,
	player: PlayerState = engineContext.activePlayer,
): TriggerEffectBundle[] {
	const bundles: TriggerEffectBundle[] = [];
	// Iterate over all registered populations, not just the PopulationRole enum
	for (const role of engineContext.populations.keys()) {
		const populationDefinition = engineContext.populations.get(role);
		// role IS the Resource ID (e.g. 'resource:core:council')
		const qty = getResourceValue(player, role);
		if (
			trigger === 'onPayUpkeepStep' &&
			populationDefinition?.upkeep &&
			qty > 0
		) {
			for (const [key, amount] of Object.entries(populationDefinition.upkeep)) {
				pushUpkeepEffect(
					bundles,
					player,
					{ type: 'resource', id: role, count: qty },
					key,
					amount * qty,
				);
			}
		}
		const list = getEffects(populationDefinition, trigger);
		if (list) {
			const clones: EffectDef[] = [];
			for (
				let populationIndex = 0;
				populationIndex < Number(qty);
				populationIndex++
			) {
				clones.push(...list.map(cloneEffect));
			}
			if (clones.length) {
				bundles.push({
					effects: clones,
					frames: () => ({
						kind: 'resource',
						id: role,
						dependsOn: [{ type: 'resource', id: role }],
					}),
				});
			}
		}
	}
	for (const land of player.lands) {
		if (trigger === 'onPayUpkeepStep' && land.upkeep) {
			for (const [key, amount] of Object.entries(land.upkeep)) {
				pushUpkeepEffect(
					bundles,
					player,
					{ type: 'land', id: land.id },
					key,
					amount,
				);
			}
		}
		const landList = getEffects(land, trigger);
		if (landList) {
			const clones = applyParamsToEffects(landList, { landId: land.id }).map(
				cloneEffect,
			);
			if (clones.length) {
				bundles.push({ effects: clones });
			}
		}
		for (const id of land.developments) {
			const developmentDefinition = engineContext.developments.get(id);
			if (trigger === 'onPayUpkeepStep' && developmentDefinition?.upkeep) {
				for (const [key, amount] of Object.entries(
					developmentDefinition.upkeep,
				)) {
					pushUpkeepEffect(
						bundles,
						player,
						{ type: 'development', id, landId: land.id },
						key,
						amount,
					);
				}
			}
			const list = getEffects(developmentDefinition, trigger);
			if (!list) {
				continue;
			}
			const clones = applyParamsToEffects(list, { landId: land.id, id }).map(
				cloneEffect,
			);
			if (clones.length) {
				bundles.push({
					effects: clones,
					frames: () => ({
						kind: 'development',
						id,
						dependsOn: [{ type: 'development', id }],
					}),
				});
			}
		}
	}
	for (const id of player.buildings) {
		const buildingDefinition = engineContext.buildings.get(id);
		if (trigger === 'onPayUpkeepStep' && buildingDefinition?.upkeep) {
			for (const [key, amount] of Object.entries(buildingDefinition.upkeep)) {
				pushUpkeepEffect(
					bundles,
					player,
					{ type: 'building', id },
					key,
					amount,
				);
			}
		}
		const list = getEffects(buildingDefinition, trigger);
		if (list) {
			const clones = list.map(cloneEffect);
			if (clones.length) {
				bundles.push({
					effects: clones,
					frames: () => ({
						kind: 'building',
						id,
						dependsOn: [{ type: 'building', id }],
					}),
				});
			}
		}
	}
	for (const passive of engineContext.passives.values(player.id)) {
		const list = getEffects(passive, trigger);
		if (list) {
			const clones = list.map(cloneEffect);
			if (clones.length) {
				bundles.push({ effects: clones, frames: passive.frames });
			}
		}
	}
	return bundles;
}
