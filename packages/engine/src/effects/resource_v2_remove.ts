import type { EffectHandler } from '.';
import type { ResourceV2ValueDelta } from '@kingdom-builder/protocol';
import {
	resolveResourceV2Player,
	type ResourceV2PlayerTarget,
} from './resource_v2_targets';

type ResourceV2RemoveParams = ResourceV2ValueDelta &
	Record<string, unknown> & {
		target?: ResourceV2PlayerTarget;
	};

export const resourceV2Remove: EffectHandler<ResourceV2RemoveParams> = (
	effect,
	context,
	multiplier = 1,
) => {
	const params = effect.params;
	if (!params) {
		throw new Error('resource_v2:remove effect requires params.');
	}
	const { target, ...delta } = params;
	context.services.resourceV2.removeValue(
		context,
		resolveResourceV2Player(context, target),
		delta as ResourceV2ValueDelta,
		multiplier,
	);
};
