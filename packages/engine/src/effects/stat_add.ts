import type { EffectHandler } from '.';
import type { StatKey } from '../state';
import { recordEffectStatDelta } from '../stat_sources';

export const statAdd: EffectHandler = (effect, engineContext, mult = 1) => {
	const key = effect.params!['key'] as StatKey;
	const amount = effect.params!['amount'] as number;
	// key is now a ResourceV2 ID - use resourceValues directly
	const before = engineContext.activePlayer.resourceValues[key] || 0;
	let newVal = before + amount * mult;
	if (newVal < 0) {
		newVal = 0;
	}
	engineContext.activePlayer.resourceValues[key] = newVal;
	if (newVal !== 0) {
		engineContext.activePlayer.statsHistory[key] = true;
	}
	const delta = newVal - before;
	if (delta !== 0) {
		recordEffectStatDelta(effect, engineContext, key, delta);
	}
};
