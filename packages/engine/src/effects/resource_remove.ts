import type { EffectHandler } from '.';
import type { ResourceKey } from '../state';
import { getResourceValue, setResourceValue } from '../resource-v2';

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
	const resourceId = player.getResourceV2Id(key);
	const have = getResourceValue(player, resourceId);
	const allowShortfall = Boolean(effect.meta?.['allowShortfall']);
	const removed = total;
	if (!allowShortfall && have < removed) {
		throw new Error(`Insufficient ${key}: need ${removed}, have ${have}`);
	}
	const targetValue = have - removed;
	const catalog = engineContext.resourceCatalogV2;
	if (catalog) {
		setResourceValue(engineContext, player, catalog, resourceId, targetValue);
	} else {
		player.resourceValues[resourceId] = targetValue;
	}
	engineContext.services.handleResourceChange(
		engineContext,
		player,
		resourceId,
	);
};
