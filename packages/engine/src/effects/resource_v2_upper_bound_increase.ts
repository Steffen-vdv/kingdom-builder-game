import type { EffectHandler } from '.';
import type { ResourceV2BoundAdjustment } from '@kingdom-builder/protocol';
import {
	resolveResourceV2Player,
	type ResourceV2PlayerTarget,
} from './resource_v2_targets';

type ResourceV2UpperBoundIncreaseParams = Omit<
	ResourceV2BoundAdjustment,
	'target'
> &
	Record<string, unknown> & {
		player?: ResourceV2PlayerTarget;
	};

export const resourceV2UpperBoundIncrease: EffectHandler<
	ResourceV2UpperBoundIncreaseParams
> = (effect, context, multiplier = 1) => {
	const params = effect.params;
	if (!params) {
		throw new Error('resource_v2:upper_bound_increase effect requires params.');
	}
	const { player, ...rest } = params;
	const adjustment: ResourceV2BoundAdjustment = {
		...rest,
		target: 'upper',
	};
	context.services.resourceV2.adjustBound(
		context,
		resolveResourceV2Player(context, player),
		adjustment,
		multiplier,
	);
};
