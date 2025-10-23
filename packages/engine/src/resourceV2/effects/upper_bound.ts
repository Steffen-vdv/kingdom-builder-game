import type {
	EffectDef,
	ResourceV2BoundsMetadata,
} from '@kingdom-builder/protocol';

import type { EffectHandler } from '../../effects';
import { assertKnownResource } from './shared';
import type { ResourceV2EffectParams } from './shared';

export interface ResourceV2UpperBoundIncreaseEffectMeta
	extends Record<string, unknown> {
	readonly reconciliation: 'clamp';
}

export type ResourceV2UpperBoundIncreaseEffect =
	EffectDef<ResourceV2EffectParams> & {
		readonly params: ResourceV2EffectParams & { readonly amount: number };
		readonly meta: ResourceV2UpperBoundIncreaseEffectMeta;
	};

export const resourceV2IncreaseUpperBoundHandler: EffectHandler<
	ResourceV2EffectParams
> = (effect, engineContext, mult = 1) => {
	if (!isResourceV2UpperBoundIncreaseEffect(effect)) {
		throw new Error('Upper-bound handler requires ResourceV2 meta.');
	}

	const player = engineContext.activePlayer;
	const state = player.resourceV2;
	const resourceId = effect.params.id;

	assertKnownResource(state, resourceId);

	const totalIncrease = resolveUpperBoundIncrease(effect, mult);
	if (totalIncrease === 0) {
		return;
	}

	const current = state.bounds[resourceId];
	const nextBounds = createUpdatedBounds(current, totalIncrease);
	state.bounds[resourceId] = nextBounds;
};

export function isResourceV2UpperBoundIncreaseEffect(
	effect: EffectDef,
): effect is ResourceV2UpperBoundIncreaseEffect {
	if (!effect.meta || typeof effect.meta !== 'object') {
		return false;
	}

	const metaRecord: Record<string, unknown> = effect.meta;
	if (metaRecord['reconciliation'] !== 'clamp') {
		return false;
	}

	if (!effect.params || typeof effect.params !== 'object') {
		return false;
	}

	const paramsRecord: Record<string, unknown> = effect.params;
	if (typeof paramsRecord['id'] !== 'string') {
		return false;
	}

	if ('key' in paramsRecord) {
		return false;
	}

	if (typeof paramsRecord['amount'] !== 'number') {
		return false;
	}

	return true;
}

function resolveUpperBoundIncrease(
	effect: ResourceV2UpperBoundIncreaseEffect,
	mult: number,
): number {
	const total = effect.params.amount * mult;
	if (!Number.isFinite(total)) {
		throw new Error('Upper-bound increase resolved to non-finite amount.');
	}

	if (total < 0) {
		throw new Error('Upper-bound increase needs non-negative value.');
	}

	return total;
}

function createUpdatedBounds(
	current: ResourceV2BoundsMetadata | undefined,
	increase: number,
): ResourceV2BoundsMetadata {
	const upper = current?.upperBound ?? 0;
	const nextUpper = upper + increase;
	const lowerBound = current?.lowerBound;
	const next: ResourceV2BoundsMetadata =
		lowerBound !== undefined
			? { lowerBound, upperBound: nextUpper }
			: { upperBound: nextUpper };
	return next;
}
