import type { EffectHandler } from '.';

export const actionRemove: EffectHandler = (effect, context, mult = 1) => {
	const id = effect.params?.['id'] as string;
	if (!id) {
		throw new Error('action:remove requires id');
	}
	const iterations = Math.floor(mult);
	let iterationIndex = 0;
	while (iterationIndex < iterations) {
		context.activePlayer.actions.delete(id);
		iterationIndex++;
	}
};
