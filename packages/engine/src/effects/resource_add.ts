import type { EffectHandler } from '.';
import type { ResourceKey } from '../state';
import { getResourceValue, setResourceValue } from '../resource-v2';

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
	const resourceId = player.getResourceV2Id(key);
	const current = getResourceValue(player, resourceId);
	const targetValue = Math.max(0, current + total);
	const catalog = context.resourceCatalogV2;
	if (catalog) {
		setResourceValue(context, player, catalog, resourceId, targetValue);
	} else {
		player.resourceValues[resourceId] = targetValue;
		if (total !== 0) {
			context.recentResourceGains.push({
				key: resourceId,
				amount: total,
			});
		}
	}
	context.services.handleResourceChange(context, player, resourceId);
};
