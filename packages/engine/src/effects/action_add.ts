import type { EffectHandler } from '.';

export const actionAdd: EffectHandler = (effect, context, mult = 1) => {
	const id = effect.params?.['id'] as string;
	if (!id) {
		throw new Error('action:add requires id');
	}
	const iterations = Math.floor(mult);
	let iterationIndex = 0;
	while (iterationIndex < iterations) {
		context.activePlayer.actions.add(id);
		iterationIndex++;
	}
};
