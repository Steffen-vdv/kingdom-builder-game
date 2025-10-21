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
		const percent = effect.params?.['percent'];
		if (typeof percent === 'number' && Number.isFinite(percent)) {
			return `Transfer ${percent}% ${descriptor.icon}`;
		}
		const amount = Number(effect.params?.['amount']);
		if (Number.isFinite(amount)) {
			const magnitude = Math.abs(amount);
			return `Transfer ${descriptor.icon}${signed(amount)}${magnitude}`;
		}
		return `Transfer ${descriptor.icon}${descriptor.label}`;
	},
	describe: (effect, context) => {
		const key = effect.params?.['key'];
		const resourceKey = typeof key === 'string' ? key : '';
		const descriptor = selectResourceDescriptor(context, resourceKey);
		const percent = effect.params?.['percent'];
		if (typeof percent === 'number' && Number.isFinite(percent)) {
			return `Transfer ${percent}% of opponent's ${descriptor.icon}${descriptor.label} to you`;
		}
		const amount = Number(effect.params?.['amount']);
		if (Number.isFinite(amount)) {
			const magnitude = Math.abs(amount);
			return `Transfer ${descriptor.icon}${signed(amount)}${magnitude} ${descriptor.label} from opponent to you`;
		}
		return `Transfer opponent resources to you`;
	},
});
