import type { EffectHandler } from '.';

/**
 * Effect handler for action:pool-remove.
 * Sets poolLocked = true for the target action,
 * removing it from the active pool.
 */
export const actionPoolRemove: EffectHandler = (effect, context, mult = 1) => {
	const targetAction = effect.params?.['targetAction'] as string | undefined;

	if (!targetAction) {
		throw new Error('action:pool-remove requires targetAction');
	}

	const iterations = Math.floor(mult);
	let iterationIndex = 0;

	while (iterationIndex < iterations) {
		// Get current state
		const state = context.activePlayer.actionStates[targetAction];
		if (!state) {
			throw new Error(
				`action:pool-remove target "${targetAction}" has no state initialized`,
			);
		}

		// Set poolLocked = true
		state.poolLocked = true;

		iterationIndex++;
	}
};
