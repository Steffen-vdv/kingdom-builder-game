import type { EffectConfig } from '@kingdom-builder/protocol';
import { resourceChange } from '../resource';
import { effect } from '../infrastructure/builders/evaluators/effectBuilder';
import { ResourceMethods, Types } from '../infrastructure/builderShared';
import type { Params } from '../infrastructure/builderShared';

export function resourceAddEffect(resourceId: string, amount: number): EffectConfig {
	const params = resourceChange(resourceId).amount(amount).build();
	return effect(Types.Resource, ResourceMethods.ADD)
		.params(params as unknown as Params)
		.build();
}
