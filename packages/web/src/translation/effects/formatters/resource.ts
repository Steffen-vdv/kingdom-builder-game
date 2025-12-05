import { signed } from '../helpers';
import { registerEffectFormatter } from '../factory';
import { selectResourceDescriptor } from '../registrySelectors';
import type { EffectDef } from '@kingdom-builder/protocol';

// Helper to extract resource key from both legacy and V2 formats
function getResourceKey(effect: EffectDef): string {
	const legacyKey = effect.params?.['key'];
	const resourceId = effect.params?.['resourceId'];
	const key = resourceId ?? legacyKey;
	return typeof key === 'string' ? key : '';
}

// Helper to extract amount from both legacy and V2 formats
function getResourceAmount(effect: EffectDef): number {
	const legacyAmount = effect.params?.['amount'];
	const change = effect.params?.['change'] as { amount?: number } | undefined;
	return Number(change?.amount ?? legacyAmount ?? 0);
}

registerEffectFormatter('resource', 'add', {
	summarize: (effect, context) => {
		const resourceKey = getResourceKey(effect);
		const descriptor = selectResourceDescriptor(context, resourceKey);
		const amount = getResourceAmount(effect);
		return `${descriptor.icon}${signed(amount)}${amount}`;
	},
	describe: (effect, context) => {
		const resourceKey = getResourceKey(effect);
		const descriptor = selectResourceDescriptor(context, resourceKey);
		const amount = getResourceAmount(effect);
		return `${descriptor.icon}${signed(amount)}${amount} ${descriptor.label}`;
	},
});

registerEffectFormatter('resource', 'remove', {
	summarize: (effect, context) => {
		const resourceKey = getResourceKey(effect);
		const descriptor = selectResourceDescriptor(context, resourceKey);
		const amount = getResourceAmount(effect);
		return `${descriptor.icon}${signed(-amount)}${-amount}`;
	},
	describe: (effect, context) => {
		const resourceKey = getResourceKey(effect);
		const descriptor = selectResourceDescriptor(context, resourceKey);
		const amount = getResourceAmount(effect);
		return `${descriptor.icon}${signed(-amount)}${-amount} ${descriptor.label}`;
	},
});

registerEffectFormatter('resource', 'transfer', {
	summarize: (effect, context) => {
		const key = effect.params?.['key'];
		const resourceKey = typeof key === 'string' ? key : '';
		const descriptor = selectResourceDescriptor(context, resourceKey);
		if (effect.params?.['amount'] !== undefined) {
			const amount = Number(effect.params['amount']);
			return `Transfer ${amount} ${descriptor.icon}`;
		}
		const percent = Number(effect.params?.['percent']);
		return `Transfer ${percent}% ${descriptor.icon}`;
	},
	describe: (effect, context) => {
		const key = effect.params?.['key'];
		const resourceKey = typeof key === 'string' ? key : '';
		const descriptor = selectResourceDescriptor(context, resourceKey);
		if (effect.params?.['amount'] !== undefined) {
			const amount = Number(effect.params['amount']);
			return `Transfer ${amount} of opponent's ${descriptor.icon}${descriptor.label} to you`;
		}
		const percent = Number(effect.params?.['percent']);
		return `Transfer ${percent}% of opponent's ${descriptor.icon}${descriptor.label} to you`;
	},
});
