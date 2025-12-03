import { applyParamsToEffects } from '@kingdom-builder/protocol';
import { PopulationRole } from '@kingdom-builder/contents';
import type { EngineContext } from './context';
import type { EffectDef } from './effects';
import type { PlayerState } from './state';
import type { StatSourceFrame } from './stat_sources';
import { getResourceValue } from './resource-v2';

export interface TriggerEffectBundle {
	effects: EffectDef[];
	frames?: StatSourceFrame | StatSourceFrame[];
}

function pushUpkeepEffect(
	bundles: TriggerEffectBundle[],
	player: PlayerState,
	source: Record<string, unknown>,
	key: string,
	amount: number,
) {
	const resourceId = player.getResourceV2Id(key);
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
	for (const role of Object.values(PopulationRole)) {
		const populationDefinition = engineContext.populations.get(role);
		const resourceId = player.getPopulationResourceV2Id(role);
		const qty = getResourceValue(player, resourceId);
		if (trigger === 'onPayUpkeepStep' && populationDefinition?.upkeep) {
			for (const [key, amount] of Object.entries(populationDefinition.upkeep)) {
				pushUpkeepEffect(
					bundles,
					player,
					{ type: 'population', id: role, count: qty },
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
						kind: 'population',
						id: role,
						dependsOn: [{ type: 'population', id: role }],
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
