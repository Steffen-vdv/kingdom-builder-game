import type { ResourceV2ValueDelta } from '@kingdom-builder/protocol';
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
	const resourceService = engineContext.services.resourceV2;
	if (resourceService.hasDefinition(key)) {
		const delta: ResourceV2ValueDelta = {
			resourceId: key,
			amount: total,
		};
		resourceService.removeValue(
			engineContext,
			engineContext.activePlayer,
			delta,
			1,
		);
		return;
	}
	const player = engineContext.activePlayer;
	const have = player.resources[key] || 0;
	const allowShortfall = Boolean(effect.meta?.['allowShortfall']);
	const removed = total;
	if (!allowShortfall && have < removed) {
		throw new Error(`Insufficient ${key}: need ${removed}, have ${have}`);
	}
	const next = have - removed;
	player.resources[key] = next;
	const applied = next - have;
	engineContext.recordRecentResourceGain(key, applied);
	engineContext.services.handleResourceChange(engineContext, player, key);
};
