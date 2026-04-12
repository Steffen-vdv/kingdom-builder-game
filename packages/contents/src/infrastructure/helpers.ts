import type { EffectConfig } from '@boardsmith/protocol';
import { resourceChange, effect, ResourceMethods, Types } from '@boardsmith/contents-sdk';
import type { Params } from '@boardsmith/contents-sdk';

export function resourceAddEffect(resourceId: string, amount: number): EffectConfig {
	const params = resourceChange(resourceId).amount(amount).build();
	return effect(Types.Resource, ResourceMethods.ADD)
		.params(params as unknown as Params)
		.build();
}
