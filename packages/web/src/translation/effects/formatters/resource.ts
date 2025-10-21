import { signed } from '../helpers';
import { registerEffectFormatter } from '../factory';
import { selectResourceDescriptor } from '../registrySelectors';

registerEffectFormatter('resource', 'add', {
	summarize: (effect, context) => {
		const key = effect.params?.['key'];
		const resourceKey = typeof key === 'string' ? key : '';
		const descriptor = selectResourceDescriptor(context, resourceKey);
		const amount = Number(effect.params?.['amount']);
		return `${descriptor.icon}${signed(amount)}${amount}`;
	},
	describe: (effect, context) => {
		const key = effect.params?.['key'];
		const resourceKey = typeof key === 'string' ? key : '';
		const descriptor = selectResourceDescriptor(context, resourceKey);
		const amount = Number(effect.params?.['amount']);
		return `${descriptor.icon}${signed(amount)}${amount} ${descriptor.label}`;
	},
});

registerEffectFormatter('resource', 'remove', {
	summarize: (effect, context) => {
		const key = effect.params?.['key'];
		const resourceKey = typeof key === 'string' ? key : '';
		const descriptor = selectResourceDescriptor(context, resourceKey);
		const amount = Number(effect.params?.['amount']);
		return `${descriptor.icon}${signed(-amount)}${-amount}`;
	},
	describe: (effect, context) => {
		const key = effect.params?.['key'];
		const resourceKey = typeof key === 'string' ? key : '';
		const descriptor = selectResourceDescriptor(context, resourceKey);
		const amount = Number(effect.params?.['amount']);
		return `${descriptor.icon}${signed(-amount)}${-amount} ${descriptor.label}`;
	},
});

registerEffectFormatter('resource', 'transfer', {
	summarize: (effect, context) => {
		const key = effect.params?.['key'];
		const resourceKey = typeof key === 'string' ? key : '';
		const descriptor = selectResourceDescriptor(context, resourceKey);
		const amountParam = effect.params?.['amount'];
		const amount =
			typeof amountParam === 'number'
				? amountParam
				: typeof amountParam === 'string'
					? Number(amountParam)
					: Number.NaN;
		if (!Number.isNaN(amount)) {
			const normalized = Math.abs(amount);
			return `Transfer ${normalized} ${descriptor.icon}`;
		}
		const percentValue = Number(effect.params?.['percent']);
		const percent = Number.isNaN(percentValue) ? 0 : percentValue;
		return `Transfer ${percent}% ${descriptor.icon}`;
	},
	describe: (effect, context) => {
		const key = effect.params?.['key'];
		const resourceKey = typeof key === 'string' ? key : '';
		const descriptor = selectResourceDescriptor(context, resourceKey);
		const amountParam = effect.params?.['amount'];
		const amount =
			typeof amountParam === 'number'
				? amountParam
				: typeof amountParam === 'string'
					? Number(amountParam)
					: Number.NaN;
		if (!Number.isNaN(amount)) {
			const normalized = Math.abs(amount);
			return `Transfer ${normalized} of opponent's ${descriptor.icon}${descriptor.label} to you`;
		}
		const percentValue = Number(effect.params?.['percent']);
		const percent = Number.isNaN(percentValue) ? 0 : percentValue;
		return `Transfer ${percent}% of opponent's ${descriptor.icon}${descriptor.label} to you`;
	},
});
