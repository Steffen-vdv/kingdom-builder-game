import type { EffectHandler } from '.';
import type { ResourceKey } from '../state';

export const resourceAdd: EffectHandler = (effect, context, multiplier = 1) => {
	const key = effect.params!['key'] as ResourceKey;
	const amount = effect.params!['amount'] as number;
	let total = amount * multiplier;
	if (effect.round === 'up') {
		total = total >= 0 ? Math.ceil(total) : Math.floor(total);
	} else if (effect.round === 'down') {
		total = total >= 0 ? Math.floor(total) : Math.ceil(total);
	}
	const current = context.activePlayer.resources[key] || 0;
	const newVal = current + total;
	const player = context.activePlayer;
	player.resources[key] = newVal < 0 ? 0 : newVal;
	if (total > 0) {
		context.recentResourceGains.push({ key, amount: total });
	}
	context.services.handleResourceChange(context, player, key);
};
