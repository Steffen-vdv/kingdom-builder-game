import type { EffectHandler } from '.';
import { canUpgrade } from '../pool';

/**
 * Effect handler for action:upgrade.
 * Increments the target action's currentTier.
 */
export const actionUpgrade: EffectHandler = (effect, context, mult = 1) => {
	const targetAction = effect.params?.['targetAction'] as string | undefined;
	const randomInMetaCategory = effect.params?.['randomInMetaCategory'] as
		| string
		| undefined;

	if (!targetAction && !randomInMetaCategory) {
		throw new Error(
			'action:upgrade requires either targetAction or randomInMetaCategory',
		);
	}

	const iterations = Math.floor(mult);
	let iterationIndex = 0;

	while (iterationIndex < iterations) {
		let actionId: string;

		if (targetAction) {
			actionId = targetAction;
		} else {
			// Random selection from meta-category
			// Find all upgradeable actions in the meta-category
			const candidates: string[] = [];
			for (const [id, action] of context.actions.entries()) {
				if (action.metaCategory !== randomInMetaCategory) {
					continue;
				}
				if (action.system) {
					continue;
				}
				const state = context.activePlayer.actionStates[id];
				if (!state) {
					continue;
				}
				if (canUpgrade(action, state.currentTier)) {
					candidates.push(id);
				}
			}

			if (candidates.length === 0) {
				throw new Error(
					`action:upgrade randomInMetaCategory "${randomInMetaCategory}" ` +
						`has no upgradeable actions`,
				);
			}

			// Use RNG service for random selection
			actionId = context.rng.pick(candidates);
		}

		// Get the action config
		const action = context.actions.get(actionId);
		if (!action) {
			throw new Error(`action:upgrade target "${actionId}" not found`);
		}

		// Get current state
		const state = context.activePlayer.actionStates[actionId];
		if (!state) {
			throw new Error(
				`action:upgrade target "${actionId}" has no state initialized`,
			);
		}

		// Validate can upgrade
		if (!canUpgrade(action, state.currentTier)) {
			throw new Error(
				`action:upgrade target "${actionId}" is already at max tier`,
			);
		}

		// Increment tier
		state.currentTier++;

		iterationIndex++;
	}
};
