import type { EffectHandler } from '.';
import type { ResourceKey } from '../state';
import { readPlayerResourceValue } from '../state';

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
	}
	if (total < 0) {
		total = 0;
	}
	const player = engineContext.activePlayer;
	const before = readPlayerResourceValue(player, key);
	const removed = total;
	if (before < removed) {
		throw new Error(`Insufficient ${key}: need ${removed}, have ${before}`);
	}
	const next = before - removed;
	player.resources[key] = next;
	const actualDelta = next - before;
	if (actualDelta !== 0) {
		engineContext.recentResourceGains.push({ key, amount: actualDelta });
	}
	engineContext.services.handleResourceChange(engineContext, player, key);
};
