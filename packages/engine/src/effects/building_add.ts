import type { EffectHandler, EffectCostCollector } from '.';
import { mapResourceIdToLegacyKey } from '../resource-v2/legacyMapping';

interface ResourceChangeEffectParams {
	readonly resourceId: string;
	readonly change?: { type: string; amount?: number };
}

export const buildingAdd: EffectHandler = (
	effect,
	context,
	multiplier = 1, // default iteration count for add effects
) => {
	const id = effect.params?.['id'] as string;
	if (!id) {
		throw new Error('building:add requires id');
	}
	const iterations = Math.floor(multiplier);
	for (let index = 0; index < iterations; index++) {
		if (context.activePlayer.buildings.has(id)) {
			throw new Error(`Building ${id} already built`);
		}
		context.activePlayer.buildings.add(id);
		const building = context.buildings.get(id);
		if (building.onBuild) {
			const passiveConfig = { id, effects: building.onBuild };
			context.passives.addPassive(passiveConfig, context, {
				frames: () => ({
					kind: 'building',
					id,
					longevity: 'ongoing' as const,
					dependsOn: [{ type: 'building', id }],
					removal: {
						type: 'building',
						id,
						detail: 'removed',
					},
				}),
			});
		}
	}
};

export const collectBuildingAddCosts: EffectCostCollector = (
	effect,
	base,
	context,
) => {
	const id = effect.params?.['id'] as string;
	if (!id) {
		return;
	}
	const catalog = context.resourceCatalogV2;
	const construction = effect.params?.['construction'] as
		| ResourceChangeEffectParams[]
		| undefined;
	if (catalog && Array.isArray(construction)) {
		for (const change of construction) {
			if (!change || !change.resourceId) {
				continue;
			}
			const config = change.change;
			if (!config || config.type !== 'amount') {
				continue;
			}
			const amount = config.amount ?? 0;
			if (!Number.isFinite(amount) || amount === 0) {
				continue;
			}
			const key = mapResourceIdToLegacyKey(change.resourceId, catalog);
			base[key] = (base[key] ?? 0) + amount;
		}
		return;
	}
	const building = context.buildings.get(id);
	for (const costKey of Object.keys(building.costs)) {
		const baseCost = base[costKey] || 0;
		const buildingCost = building.costs[costKey] || 0;
		base[costKey] = baseCost + buildingCost;
	}
};
