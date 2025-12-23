import type { EffectHandler } from '.';

/**
 * Effect handler for action:add.
 * Sets locked = false in actionStates (content-controlled unlock).
 * This is used when a building or other content unlocks an action.
 */
export const actionAdd: EffectHandler = (effect, context, mult = 1) => {
	const id = effect.params?.['id'] as string;
	if (!id) {
		throw new Error('action:add requires id');
	}
	const iterations = Math.floor(mult);
	let iterationIndex = 0;
	while (iterationIndex < iterations) {
		// Update actionStates model
		const state = context.activePlayer.actionStates[id];
		if (state) {
			state.locked = false;
		}

		iterationIndex++;
	}
};
