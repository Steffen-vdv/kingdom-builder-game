import type { EffectHandler } from '.';
import type { ResourceV2Transfer } from '@kingdom-builder/protocol';
import {
	resolveResourceV2Player,
	type ResourceV2PlayerTarget,
} from './resource_v2_targets';

type ResourceV2TransferParams = ResourceV2Transfer &
	Record<string, unknown> & {
		donor?: ResourceV2PlayerTarget;
		recipient?: ResourceV2PlayerTarget;
	};

export const resourceV2Transfer: EffectHandler<ResourceV2TransferParams> = (
	effect,
	context,
	multiplier = 1,
) => {
	const params = effect.params;
	if (!params) {
		throw new Error('resource_v2:transfer effect requires params.');
	}
	const { donor = 'opponent', recipient = 'active', ...transfer } = params;
	context.services.resourceV2.transferValue(
		context,
		resolveResourceV2Player(context, donor),
		resolveResourceV2Player(context, recipient),
		transfer as ResourceV2Transfer,
		multiplier,
	);
};
