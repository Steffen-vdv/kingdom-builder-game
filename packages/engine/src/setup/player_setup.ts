import type { PlayerState } from '../state';
import type {
	ActionConfig as ActionDef,
	ActionMetaCategoryConfig,
	Registry,
} from '@kingdom-builder/protocol';
import { createInitialActionState, runPoolFill } from '../pool/fillAlgorithm';
import type { RngService } from '../services';

/**
 * Initializes actionStates for all non-system actions.
 * Each action gets an initial state based on its definition and
 * whether its meta-category has a pool.
 */
export function initializePlayerActionStates(
	playerState: PlayerState,
	actions: Registry<ActionDef>,
	metaCategories: Registry<ActionMetaCategoryConfig>,
): void {
	// Build a quick lookup of which meta-categories have pools
	const metaCategoryHasPool = new Map<string, boolean>();
	for (const [id, metaCategory] of metaCategories.entries()) {
		metaCategoryHasPool.set(id, !!metaCategory.pool);
	}

	for (const [actionId, action] of actions.entries()) {
		// System actions are engine-only, never get state
		if (action.system) {
			continue;
		}

		const id = action.id ?? actionId;
		if (!id) {
			continue;
		}

		// Determine if this action's meta-category has a pool
		const hasPool = metaCategoryHasPool.get(action.metaCategory) ?? false;

		// Create initial action state
		playerState.actionStates[id] = createInitialActionState(action, hasPool);
	}
}

/**
 * Runs initial pool fill for all meta-categories that have pools.
 * This populates each pool up to its configured size.
 */
export function runInitialPoolFills(
	playerState: PlayerState,
	actions: Registry<ActionDef>,
	metaCategories: Registry<ActionMetaCategoryConfig>,
	rng: RngService,
): void {
	for (const [_metaCategoryId, metaCategory] of metaCategories.entries()) {
		if (!metaCategory.pool) {
			continue;
		}

		// Gather actions in this meta-category
		const categoryActions = new Map<string, ActionDef>();
		for (const [actionId, action] of actions.entries()) {
			if (action.metaCategory === metaCategory.id && !action.system) {
				categoryActions.set(actionId, action);
			}
		}

		// Pre-randomize: exclude excess candidates when
		// candidatePoolSize is set
		const candidatePoolSize = metaCategory.pool.candidatePoolSize;
		if (candidatePoolSize !== undefined) {
			const candidates = Array.from(categoryActions.keys()).filter((id) => {
				const state = playerState.actionStates[id];
				return state && !state.locked && state.poolLocked && !state.exhausted;
			});
			if (candidates.length > candidatePoolSize) {
				// Fisher-Yates shuffle using rng
				for (let i = candidates.length - 1; i > 0; i--) {
					const j = rng.randomInt(i + 1);
					[candidates[i], candidates[j]] = [candidates[j]!, candidates[i]!];
				}
				const excluded = candidates.slice(candidatePoolSize);
				for (const id of excluded) {
					const state = playerState.actionStates[id];
					if (state) {
						state.exhausted = true;
					}
				}
			}
		}

		// Run pool fill
		const result = runPoolFill(playerState, metaCategory, categoryActions, rng);

		// Apply pool fill results: set poolLocked = false for selected actions
		for (const actionId of result.selectedActions) {
			const state = playerState.actionStates[actionId];
			if (state) {
				state.poolLocked = false;
			}
		}
	}
}

export type { ActionCostConfiguration } from './action_cost_resolver';
export { determineCommonActionCostResource } from './action_cost_resolver';
