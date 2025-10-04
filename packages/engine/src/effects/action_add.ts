import type { EffectHandler } from '.';

export const actionAdd: EffectHandler = (effect, ctx, mult = 1) => {
	const id = effect.params?.['id'] as string;
	if (!id) {
		throw new Error('action:add requires id');
	}
	for (let i = 0; i < Math.floor(mult); i++) {
		ctx.activePlayer.actions.add(id);
	}
};
