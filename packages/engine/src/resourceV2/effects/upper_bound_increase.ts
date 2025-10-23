import type { EffectDef } from '@kingdom-builder/protocol';

import type { EffectHandler } from '../../effects';
import { assertKnownResource } from './common';

interface ResourceV2UpperBoundIncreaseParams extends Record<string, unknown> {
	readonly id: string;
	readonly amount: number;
}

type ResourceV2UpperBoundIncreaseEffect =
	EffectDef<ResourceV2UpperBoundIncreaseParams> & {
		readonly params: ResourceV2UpperBoundIncreaseParams;
	};

export function isResourceV2UpperBoundIncreaseEffect(
	effect: EffectDef,
): effect is ResourceV2UpperBoundIncreaseEffect {
	if (!effect.params || typeof effect.params !== 'object') {
		return false;
	}

	const params = effect.params;
	if (typeof params['id'] !== 'string') {
		return false;
	}

	if (typeof params['amount'] !== 'number') {
		return false;
	}

	if (effect.meta && typeof effect.meta !== 'object') {
		return false;
	}

	return true;
}

export const resourceV2UpperBoundIncreaseHandler: EffectHandler<
	ResourceV2UpperBoundIncreaseParams
> = (effect, engineContext, mult = 1) => {
	if (!isResourceV2UpperBoundIncreaseEffect(effect)) {
		throw new Error(
			'resourceV2UpperBoundIncreaseHandler expected a ResourceV2 effect.',
		);
	}

	const player = engineContext.activePlayer;
	const state = player.resourceV2;
	const resourceId = effect.params.id;
	assertKnownResource(state, resourceId);

	const delta = resolveUpperBoundIncreaseDelta(effect.params.amount, mult);
	if (delta === 0) {
		return;
	}

	const currentBounds = state.bounds[resourceId];
	if (!currentBounds || currentBounds.upperBound === undefined) {
		throw new Error(
			'Upper-bound increase requires an existing upper bound for "' +
				resourceId +
				'".',
		);
	}

	state.bounds[resourceId] = {
		...currentBounds,
		upperBound: currentBounds.upperBound + delta,
	};
};

function resolveUpperBoundIncreaseDelta(amount: number, mult: number): number {
	const total = amount * mult;
	if (!Number.isFinite(total)) {
		throw new Error(
			'ResourceV2 upper-bound increase resolved to a non-finite amount.',
		);
	}

	if (total < 0) {
		throw new Error(
			'ResourceV2 upper-bound increase amount must not be negative.',
		);
	}

	if (!Number.isInteger(total)) {
		throw new Error(
			'ResourceV2 upper-bound increase amount must resolve to an integer.',
		);
	}

	return total;
}
