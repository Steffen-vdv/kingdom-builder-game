import type { EffectHandler, EffectCostCollector } from '.';

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
	const building = context.buildings.get(id);
	for (const costKey of Object.keys(building.costs)) {
		const baseCost = base[costKey] || 0;
		const buildingCost = building.costs[costKey] || 0;
		base[costKey] = baseCost + buildingCost;
	}
};
