import type { EffectHandler } from '.';

export const buildingRemove: EffectHandler = (effect, ctx, mult = 1) => {
	const id = effect.params?.['id'] as string;
	if (!id) {
		throw new Error('building:remove requires id');
	}
	const iterations = Math.floor(mult);
	for (let index = 0; index < iterations; index++) {
		if (!ctx.activePlayer.buildings.delete(id)) {
			break;
		}
		ctx.passives.removePassive(id, ctx);
	}
};
