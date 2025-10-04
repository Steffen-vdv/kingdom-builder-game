import type { EffectHandler, EffectCostCollector } from '.';

export const buildingAdd: EffectHandler = (effect, ctx, mult = 1) => {
	const id = effect.params?.['id'] as string;
	if (!id) {
		throw new Error('building:add requires id');
	}
	const iterations = Math.floor(mult);
	for (let index = 0; index < iterations; index++) {
		if (ctx.activePlayer.buildings.has(id)) {
			throw new Error(`Building ${id} already built`);
		}
		ctx.activePlayer.buildings.add(id);
		const building = ctx.buildings.get(id);
		if (building.onBuild) {
			ctx.passives.addPassive({ id, effects: building.onBuild }, ctx, {
				frames: () => ({
					kind: 'building',
					id,
					longevity: 'ongoing' as const,
					dependsOn: [{ type: 'building', id }],
					removal: { type: 'building', id, detail: 'removed' },
				}),
			});
		}
	}
};

export const collectBuildingAddCosts: EffectCostCollector = (
	effect,
	base,
	ctx,
) => {
	const id = effect.params?.['id'] as string;
	if (!id) {
		return;
	}
	const building = ctx.buildings.get(id);
	for (const key of Object.keys(building.costs)) {
		base[key] = (base[key] || 0) + (building.costs[key] || 0);
	}
};
