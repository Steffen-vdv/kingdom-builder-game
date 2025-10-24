import type { ResourceV2ValueDelta } from '@kingdom-builder/protocol';
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
	} else if (effect.round === 'nearest') {
		total = Math.round(total);
	}
	const resourceService = context.services.resourceV2;
	if (resourceService.hasDefinition(key)) {
		const delta: ResourceV2ValueDelta = {
			resourceId: key,
			amount: total,
		};
		resourceService.addValue(context, context.activePlayer, delta, 1);
		return;
	}
	const current = context.activePlayer.resources[key] || 0;
	const newVal = current + total;
	const player = context.activePlayer;
	const next = newVal < 0 ? 0 : newVal;
	player.resources[key] = next;
	const applied = next - current;
	context.recordRecentResourceGain(key, applied);
	context.services.handleResourceChange(context, player, key);
};
