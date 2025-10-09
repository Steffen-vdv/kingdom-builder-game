import type { EffectHandler } from '.';

export const passiveRemove: EffectHandler = (
	effect,
	engineContext,
	mult = 1,
) => {
	const id = effect.params?.['id'] as string;
	if (!id) {
		throw new Error('passive:remove requires id');
	}
	for (let index = 0; index < Math.floor(mult); index++) {
		engineContext.passives.removePassive(id, engineContext);
	}
};
