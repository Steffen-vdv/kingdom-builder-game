import type { EffectConfig } from '@kingdom-builder/protocol';
import { effect, type EffectBuilder } from '../evaluators';
import { resolveEffectConfig } from '../effectParams';

type TierEffectInput = EffectConfig | EffectBuilder | ((builder: EffectBuilder) => EffectBuilder);

export function resolveTierEffectConfig(value: TierEffectInput) {
	if (typeof value === 'function') {
		return value(effect()).build();
	}
	return resolveEffectConfig(value);
}

export type { TierEffectInput };
