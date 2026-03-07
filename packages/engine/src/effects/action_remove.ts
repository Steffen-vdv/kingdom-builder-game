import type { EffectHandler } from '.';

/**
 * Effect handler for action:remove.
 * Sets locked = true in actionStates (content-controlled lock).
 * This is used when a building is removed or other content locks an action.
 */
export const actionRemove: EffectHandler = (effect, context, mult = 1) => {
	const id = effect.params?.['id'] as string;
	if (!id) {
		throw new Error('action:remove requires id');
	}
	const iterations = Math.floor(mult);
	let iterationIndex = 0;
	while (iterationIndex < iterations) {
		// Update actionStates model
		const state = context.activePlayer.actionStates[id];
		if (state) {
			state.locked = true;
		}

		iterationIndex++;
	}
};
