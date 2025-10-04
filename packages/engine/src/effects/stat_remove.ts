import type { EffectHandler } from '.';
import type { StatKey } from '../state';
import { recordEffectStatDelta } from '../stat_sources';

export const statRemove: EffectHandler = (effect, ctx, mult = 1) => {
	const key = effect.params!['key'] as StatKey;
	const amount = effect.params!['amount'] as number;
	const before = ctx.activePlayer.stats[key] || 0;
	let newVal = before - amount * mult;
	if (newVal < 0) {
		newVal = 0;
	}
	ctx.activePlayer.stats[key] = newVal;
	if (newVal !== 0) {
		ctx.activePlayer.statsHistory[key] = true;
	}
	const delta = newVal - before;
	if (delta !== 0) {
		recordEffectStatDelta(effect, ctx, key, delta);
	}
};
