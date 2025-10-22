import type {
	ResourceV2TierDefinition,
	ResourceV2TierTrackDefinition,
} from './types';

export type Mutable<T> = {
	-readonly [K in keyof T]: T[K] extends ReadonlyArray<infer U> ? U[] : T[K];
};

export const EMPTY_STRING_ARRAY: ReadonlyArray<string> = Object.freeze<
	string[]
>([]);

export function cloneAndFreeze<T>(value: T): T {
	if (value === undefined || value === null) {
		return value;
	}

	if (typeof value !== 'object') {
		return value;
	}

	const cloned = cloneValue(value);
	return deepFreeze(cloned);
}

export function cloneValue<T>(value: T): T {
	if (value === undefined || value === null) {
		return value;
	}

	if (typeof value !== 'object') {
		return value;
	}

	return JSON.parse(JSON.stringify(value)) as T;
}

export function deepFreeze<T>(value: T): T {
	if (value === undefined || value === null) {
		return value;
	}

	if (typeof value !== 'object') {
		return value;
	}

	if (Array.isArray(value)) {
		for (const entry of value) {
			deepFreeze(entry);
		}
	} else {
		for (const key of Object.keys(value as Record<string, unknown>)) {
			const entry = (value as Record<string, unknown>)[key];
			deepFreeze(entry);
		}
	}

	return Object.freeze(value);
}

export function freezeArray(values: Iterable<string>): ReadonlyArray<string> {
	return Object.freeze([...values]);
}

export function createTierDefinitionIndex(
	track: ResourceV2TierTrackDefinition,
): Map<string, ResourceV2TierDefinition> {
	const tiers = new Map<string, ResourceV2TierDefinition>();
	for (const tier of track.tiers) {
		tiers.set(tier.id, tier);
	}
	return tiers;
}
