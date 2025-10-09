import type { EffectHandler } from '.';

export const buildingRemove: EffectHandler = (
	effect,
	engineContext,
	mult = 1,
) => {
	const id = effect.params?.['id'] as string;
	if (!id) {
		throw new Error('building:remove requires id');
	}
	const iterations = Math.floor(mult);
	for (let index = 0; index < iterations; index++) {
		if (!engineContext.activePlayer.buildings.delete(id)) {
			break;
		}
		engineContext.passives.removePassive(id, engineContext);
	}
};
