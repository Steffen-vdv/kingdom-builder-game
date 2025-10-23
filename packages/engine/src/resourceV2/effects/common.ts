import type { EffectDef } from '@kingdom-builder/protocol';

import type { PlayerResourceV2State } from '../../state';

export type ResourceV2RoundingMode = 'up' | 'down' | 'nearest';

export function round(value: number, mode: ResourceV2RoundingMode): number {
	if (mode === 'up') {
		return value >= 0 ? Math.ceil(value) : Math.floor(value);
	}

	if (mode === 'down') {
		return value >= 0 ? Math.floor(value) : Math.ceil(value);
	}

	const floored = Math.floor(value);
	const fractional = value - floored;
	if (fractional < 0.5) {
		return floored;
	}

	return Math.ceil(value);
}

export function resolveRounding(
	round?: EffectDef['round'],
): ResourceV2RoundingMode {
	if (round === 'up' || round === 'down') {
		return round;
	}

	return 'nearest';
}

export function assertKnownResource(state: PlayerResourceV2State, id: string) {
	if (!Object.prototype.hasOwnProperty.call(state.amounts, id)) {
		throw new Error(`Unknown ResourceV2 resource id: ${id}`);
	}
}

export function assertResourceSupportsDirectMutations(
	state: PlayerResourceV2State,
	id: string,
) {
	assertKnownResource(state, id);

	if (Object.prototype.hasOwnProperty.call(state.parentChildren, id)) {
		throw new Error(
			`ResourceV2 parent "${id}" value derives from its children.`,
		);
	}
}
