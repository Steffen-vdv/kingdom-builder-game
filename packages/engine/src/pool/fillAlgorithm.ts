import type {
	ActionConfig,
	ActionMetaCategoryConfig,
} from '@boardsmith/protocol';
import type { PlayerState, ActionState } from '../state';
import type { RngService } from '../services';

/**
 * Represents a candidate action for pool selection.
 */
interface PoolCandidate {
	actionId: string;
	currentTier: number;
}

/**
 * Result of running the pool fill algorithm.
 */
export interface PoolFillResult {
	/** Actions selected to be added to the pool */
	selectedActions: string[];
	/** Number of actions needed but not available (pool under-fill) */
	deficit: number;
}

/**
 * Gets the applicable tier weights based on binding spent.
 * Returns the weights from the highest threshold
 * where bindingSpent >= threshold.
 */
function getApplicableWeights(
	thresholds: readonly {
		bindingSpent: number;
		weights: Record<number, number>;
	}[],
	bindingSpent: number,
): Record<number, number> {
	// Find the highest threshold that applies
	let applicable = thresholds[0];
	for (const threshold of thresholds) {
		if (bindingSpent >= threshold.bindingSpent) {
			applicable = threshold;
		} else {
			break; // Thresholds are sorted ascending, so we can stop
		}
	}
	return applicable?.weights ?? {};
}

/**
 * Groups candidates by their current tier.
 */
function groupByTier(
	candidates: PoolCandidate[],
): Map<number, PoolCandidate[]> {
	const groups = new Map<number, PoolCandidate[]>();
	for (const candidate of candidates) {
		const tier = candidate.currentTier;
		if (!groups.has(tier)) {
			groups.set(tier, []);
		}
		groups.get(tier)!.push(candidate);
	}
	return groups;
}

/**
 * Calculates effective weights for tier selection.
 * Only tiers with at least one candidate get weight.
 */
function calculateEffectiveWeights(
	tierGroups: Map<number, PoolCandidate[]>,
	weights: Record<number, number>,
): { tiers: number[]; weights: number[] } {
	const tiers: number[] = [];
	const effectiveWeights: number[] = [];

	for (const [tier, candidates] of tierGroups) {
		if (
			candidates.length > 0 &&
			weights[tier] !== undefined &&
			weights[tier] > 0
		) {
			tiers.push(tier);
			effectiveWeights.push(weights[tier]);
		}
	}

	return { tiers, weights: effectiveWeights };
}

/**
 * Runs the pool fill algorithm to select actions for the pool.
 *
 * @param player The player state
 * @param metaCategory The meta-category configuration (must have pool config)
 * @param actions Map of action configs in this meta-category
 * @param rng The RNG service for weighted random selection
 * @returns The actions selected and any deficit
 */
export function runPoolFill(
	player: PlayerState,
	metaCategory: ActionMetaCategoryConfig,
	actions: Map<string, ActionConfig>,
	rng: RngService,
): PoolFillResult {
	const pool = metaCategory.pool;
	if (!pool) {
		throw new Error(
			`Cannot run pool fill for meta-category "${metaCategory.id}" - no pool config`,
		);
	}

	const { size, fillMode } = pool;

	// Count current pool size (actions that are not pool-locked)
	let currentPoolSize = 0;
	for (const [actionId, action] of actions) {
		if (action.system) {
			continue;
		}
		const state = player.actionStates[actionId];
		if (state && !state.locked && !state.poolLocked) {
			currentPoolSize++;
		}
	}

	// Calculate how many we need to add
	const neededCount = size - currentPoolSize;
	if (neededCount <= 0) {
		return { selectedActions: [], deficit: 0 };
	}

	// Get binding spent for this meta-category
	const bindingSpent = player.metaCategoryBindingSpent[metaCategory.id] ?? 0;

	// Get applicable tier weights
	const weights = getApplicableWeights(fillMode.thresholds, bindingSpent);

	// Collect candidates: not system, not content-locked,
	// pool-locked, not exhausted
	const candidates: PoolCandidate[] = [];
	for (const [actionId, action] of actions) {
		if (action.system) {
			continue;
		}
		const state = player.actionStates[actionId];
		if (state && !state.locked && state.poolLocked && !state.exhausted) {
			candidates.push({
				actionId,
				currentTier: state.currentTier,
			});
		}
	}

	// Group by tier
	const tierGroups = groupByTier(candidates);

	// Calculate effective weights
	const { tiers, weights: effectiveWeights } = calculateEffectiveWeights(
		tierGroups,
		weights,
	);

	// Select actions
	const selectedActions: string[] = [];
	const selectedSet = new Set<string>();

	while (selectedActions.length < neededCount && tiers.length > 0) {
		// Recalculate effective weights after each selection
		// (in case a tier group becomes empty)
		const currentTiers: number[] = [];
		const currentWeights: number[] = [];

		for (let i = 0; i < tiers.length; i++) {
			const tier = tiers[i]!;
			const group = tierGroups.get(tier) ?? [];
			const remaining = group.filter((c) => !selectedSet.has(c.actionId));
			if (remaining.length > 0) {
				currentTiers.push(tier);
				currentWeights.push(effectiveWeights[i]!);
				// Update the group to only have remaining
				tierGroups.set(tier, remaining);
			}
		}

		if (currentTiers.length === 0) {
			break; // No more candidates
		}

		// Weighted random tier selection
		const tierIndex = rng.weightedSelect(currentWeights);
		const selectedTier = currentTiers[tierIndex]!;
		const tierCandidates = tierGroups.get(selectedTier) ?? [];

		if (tierCandidates.length === 0) {
			continue; // Safety check
		}

		// Random selection within the tier
		const candidateIndex = rng.randomInt(tierCandidates.length);
		const selected = tierCandidates[candidateIndex]!;

		selectedActions.push(selected.actionId);
		selectedSet.add(selected.actionId);

		// Remove from tier group
		tierCandidates.splice(candidateIndex, 1);
	}

	const deficit = neededCount - selectedActions.length;

	return { selectedActions, deficit };
}

/**
 * Gets the starting tier for an action (the lowest defined tier number).
 */
export function getStartingTier(action: ActionConfig): number {
	const tierNumbers = Object.keys(action.tiers)
		.map(Number)
		.filter((n) => !isNaN(n));
	if (tierNumbers.length === 0) {
		throw new Error(`Action "${action.id}" has no tiers defined`);
	}
	return Math.min(...tierNumbers);
}

/**
 * Gets the maximum tier for an action (the highest defined tier number).
 */
export function getMaxTier(action: ActionConfig): number {
	const tierNumbers = Object.keys(action.tiers)
		.map(Number)
		.filter((n) => !isNaN(n));
	if (tierNumbers.length === 0) {
		throw new Error(`Action "${action.id}" has no tiers defined`);
	}
	return Math.max(...tierNumbers);
}

/**
 * Checks if an action can be upgraded (has a next tier).
 */
export function canUpgrade(action: ActionConfig, currentTier: number): boolean {
	const maxTier = getMaxTier(action);
	return currentTier < maxTier;
}

/**
 * Creates initial action state for an action.
 */
export function createInitialActionState(
	action: ActionConfig,
	hasPool: boolean,
): ActionState {
	const startingTier = getStartingTier(action);
	return {
		locked: action.locked ?? false,
		poolLocked: hasPool,
		currentTier: startingTier,
		exhausted: false,
		usesThisTurn: 0,
	};
}
