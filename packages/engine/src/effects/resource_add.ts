import type { EffectHandler } from '.';
import type { ResourceKey } from '../state';

export const resourceAdd: EffectHandler = (effect, ctx, mult = 1) => {
	const key = effect.params!['key'] as ResourceKey;
	const amount = effect.params!['amount'] as number;
	let total = amount * mult;
	if (effect.round === 'up')
		total = total >= 0 ? Math.ceil(total) : Math.floor(total);
	else if (effect.round === 'down')
		total = total >= 0 ? Math.floor(total) : Math.ceil(total);
	const current = ctx.activePlayer.resources[key] || 0;
	const newVal = current + total;
	const clamped = newVal < 0 ? 0 : newVal;
	ctx.activePlayer.resources[key] = clamped;
	ctx.services.happinessThresholds.handleResourceChange(
		ctx,
		ctx.activePlayer,
		key,
		current,
		clamped,
	);
	if (total > 0) ctx.recentResourceGains.push({ key, amount: total });
};
