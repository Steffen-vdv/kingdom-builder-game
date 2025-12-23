import type { EffectHandler } from '.';

/**
 * Effect handler for action:pool-add.
 * Sets poolLocked = false for the target action, adding it to the active pool.
 */
export const actionPoolAdd: EffectHandler = (effect, context, mult = 1) => {
	const targetAction = effect.params?.['targetAction'] as string | undefined;

	if (!targetAction) {
		throw new Error('action:pool-add requires targetAction');
	}

	const iterations = Math.floor(mult);
	let iterationIndex = 0;

	while (iterationIndex < iterations) {
		// Get current state
		const state = context.activePlayer.actionStates[targetAction];
		if (!state) {
			throw new Error(
				`action:pool-add target "${targetAction}" has no state initialized`,
			);
		}

		// Set poolLocked = false
		state.poolLocked = false;

		iterationIndex++;
	}
};
