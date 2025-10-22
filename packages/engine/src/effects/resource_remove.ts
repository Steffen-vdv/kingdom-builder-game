import type { EffectHandler } from '.';
import type { ResourceKey } from '../state';

export const resourceRemove: EffectHandler = (
	effect,
	engineContext,
	mult = 1,
) => {
	const key = effect.params!['key'] as ResourceKey;
	const amount = effect.params!['amount'] as number;
	let total = amount * mult;
	if (effect.round === 'up') {
		total = total >= 0 ? Math.ceil(total) : Math.floor(total);
	} else if (effect.round === 'down') {
		total = total >= 0 ? Math.floor(total) : Math.ceil(total);
	} else if (effect.round === 'nearest') {
		total = Math.round(total);
	}
	if (total < 0) {
		total = 0;
	}
	const player = engineContext.activePlayer;
	const have = player.resources[key] || 0;
	const allowShortfall = Boolean(effect.meta?.['allowShortfall']);
	const removed = total;
	if (!allowShortfall && have < removed) {
		throw new Error(`Insufficient ${key}: need ${removed}, have ${have}`);
	}
	player.resources[key] = have - removed;
	engineContext.services.handleResourceChange(engineContext, player, key);
};
