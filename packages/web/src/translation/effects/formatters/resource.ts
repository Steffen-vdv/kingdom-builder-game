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
