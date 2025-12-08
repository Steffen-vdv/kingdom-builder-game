import type { EffectConfig } from '@kingdom-builder/protocol';
import { getStatResourceId, type StatKey } from './stats';
import { resourceChange } from '../resource';
import { effect } from '../config/builders/evaluators/effectBuilder';
import { ResourceMethods, Types } from '../config/builderShared';
import type { Params } from '../config/builderShared';

export function statAddEffect(stat: StatKey, amount: number): EffectConfig {
	const resourceId = getStatResourceId(stat);
	const params = resourceChange(resourceId).amount(amount).build();
	return effect(Types.Resource, ResourceMethods.ADD)
		.params(params as unknown as Params)
		.build();
}
