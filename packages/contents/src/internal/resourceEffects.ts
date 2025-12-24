import type { EffectConfig } from '@kingdom-builder/protocol';
import { resourceChange, effect, ResourceMethods, Types } from '@kingdom-builder/contents-sdk';
import type { Params } from '@kingdom-builder/contents-sdk';

export function resourceAddEffect(resourceId: string, amount: number): EffectConfig {
	const params = resourceChange(resourceId).amount(amount).build();
	return effect(Types.Resource, ResourceMethods.ADD)
		.params(params as unknown as Params)
		.build();
}
