import type { EffectHandler } from '.';
import type { ResourceKey } from '../state';
import { recordEffectResourceDelta } from '../resource_sources';

export const statRemove: EffectHandler = (effect, engineContext, mult = 1) => {
	const key = effect.params!['key'] as ResourceKey;
	const amount = effect.params!['amount'] as number;
	// key is now a ResourceV2 ID - use resourceValues directly
	const before = engineContext.activePlayer.resourceValues[key] || 0;
	let newVal = before - amount * mult;
	if (newVal < 0) {
		newVal = 0;
	}
	engineContext.activePlayer.resourceValues[key] = newVal;
	if (newVal !== 0) {
		engineContext.activePlayer.resourceTouched[key] = true;
	}
	const delta = newVal - before;
	if (delta !== 0) {
		recordEffectResourceDelta(effect, engineContext, key, delta);
	}
};
