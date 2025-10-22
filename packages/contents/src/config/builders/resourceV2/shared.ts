import type { EffectDef } from '@kingdom-builder/protocol';
import { EffectBuilder } from '../evaluators';

export type EffectLike = EffectDef | EffectBuilder;

export function normalizeEffect(effect: EffectLike): EffectDef {
	return effect instanceof EffectBuilder ? effect.build() : effect;
}
