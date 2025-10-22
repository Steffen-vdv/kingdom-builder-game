import type { PlayerState } from '../state';
import type {
	RuntimeResourceTierDefinition,
	RuntimeResourceTierTrack,
} from './types';

const integerAssertionPrefix = 'ResourceV2 state expected an integer value for';

export function assertInteger(value: number, context: string): void {
	if (!Number.isInteger(value)) {
		throw new Error(
			`${integerAssertionPrefix} ${context} but received ${value}.`,
		);
	}
}

function tierContainsValue(
	tier: RuntimeResourceTierDefinition,
	value: number,
): boolean {
	const { min, max } = tier.threshold;
	if (min !== null && value < min) {
		return false;
	}
	if (max !== null && value > max) {
		return false;
	}
	return true;
}

export function resolveTierForValue(
	track: RuntimeResourceTierTrack | undefined,
	value: number,
): string | null {
	if (!track) {
		return null;
	}
	let matchedId: string | null = null;
	let matchedOrder = Number.POSITIVE_INFINITY;
	for (const tier of track.tiers) {
		if (tierContainsValue(tier, value) && tier.resolvedOrder < matchedOrder) {
			matchedId = tier.id;
			matchedOrder = tier.resolvedOrder;
		}
	}
	return matchedId;
}

export function clampValue(
	value: number,
	lowerBound: number | null,
	upperBound: number | null,
): {
	value: number;
	clampedToLowerBound: boolean;
	clampedToUpperBound: boolean;
} {
	let nextValue = value;
	let clampedToLowerBound = false;
	let clampedToUpperBound = false;
	if (lowerBound !== null && nextValue < lowerBound) {
		nextValue = lowerBound;
		clampedToLowerBound = true;
	}
	if (upperBound !== null && nextValue > upperBound) {
		nextValue = upperBound;
		clampedToUpperBound = true;
	}
	return { value: nextValue, clampedToLowerBound, clampedToUpperBound };
}

export function readBounds(
	player: PlayerState,
	resourceId: string,
): { lowerBound: number | null; upperBound: number | null } {
	if (!(resourceId in player.resourceValues)) {
		throw new Error(
			`ResourceV2 state attempted to access value for unknown resource "${resourceId}". Initialise player state first.`,
		);
	}
	return {
		lowerBound:
			resourceId in player.resourceLowerBounds
				? (player.resourceLowerBounds[resourceId] ?? null)
				: null,
		upperBound:
			resourceId in player.resourceUpperBounds
				? (player.resourceUpperBounds[resourceId] ?? null)
				: null,
	};
}

export function pruneUnknownKeys<T>(
	target: Record<string, T>,
	allowedIds: Set<string>,
): void {
	for (const key of Object.keys(target)) {
		if (!allowedIds.has(key)) {
			delete target[key];
		}
	}
}
