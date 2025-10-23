import type { EffectHandler } from '.';
import type { ResourceKey } from '../state';
import { readPlayerResourceValue } from '../state';

export const resourceAdd: EffectHandler = (effect, context, multiplier = 1) => {
	const key = effect.params!['key'] as ResourceKey;
	const amount = effect.params!['amount'] as number;
	let total = amount * multiplier;
	if (effect.round === 'up') {
		total = total >= 0 ? Math.ceil(total) : Math.floor(total);
	} else if (effect.round === 'down') {
		total = total >= 0 ? Math.floor(total) : Math.ceil(total);
	}
	const player = context.activePlayer;
	const before = readPlayerResourceValue(player, key);
	let next = before + total;
	if (next < 0) {
		next = 0;
	}
	player.resources[key] = next;
	const actualDelta = next - before;
	if (actualDelta !== 0) {
		context.recentResourceGains.push({ key, amount: actualDelta });
	}
	context.services.handleResourceChange(context, player, key);
};
