import type { EffectConfig } from '@kingdom-builder/protocol';
import type { EffectBuilder } from '../evaluators';

function isEffectBuilder(value: EffectConfig | EffectBuilder): value is EffectBuilder {
	return typeof (value as EffectBuilder).build === 'function';
}

export function resolveEffectConfig(effect: EffectConfig | EffectBuilder) {
	return isEffectBuilder(effect) ? effect.build() : effect;
}
