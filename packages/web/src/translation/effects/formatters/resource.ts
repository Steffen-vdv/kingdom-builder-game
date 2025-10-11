import { signed, resolveResourceDisplay } from '../helpers';
import { registerEffectFormatter } from '../factory';

registerEffectFormatter('resource', 'add', {
	summarize: (effect, context) => {
		const rawKey = effect.params?.['key'];
		const resourceKey = typeof rawKey === 'string' ? rawKey : '';
		const resource = resolveResourceDisplay(context, resourceKey);
		const icon = resource.icon || resourceKey || resource.label;
		const amount = Number(effect.params?.['amount']);
		return `${icon}${signed(amount)}${amount}`;
	},
	describe: (effect, context) => {
		const rawKey = effect.params?.['key'];
		const resourceKey = typeof rawKey === 'string' ? rawKey : '';
		const resource = resolveResourceDisplay(context, resourceKey);
		const label = resource.label || resourceKey || 'Resource';
		const icon = resource.icon || resourceKey || label;
		const amount = Number(effect.params?.['amount']);
		return `${icon}${signed(amount)}${amount} ${label}`;
	},
});

registerEffectFormatter('resource', 'remove', {
	summarize: (effect, context) => {
		const rawKey = effect.params?.['key'];
		const resourceKey = typeof rawKey === 'string' ? rawKey : '';
		const resource = resolveResourceDisplay(context, resourceKey);
		const icon = resource.icon || resourceKey || resource.label;
		const amount = Number(effect.params?.['amount']);
		return `${icon}${signed(-amount)}${-amount}`;
	},
	describe: (effect, context) => {
		const rawKey = effect.params?.['key'];
		const resourceKey = typeof rawKey === 'string' ? rawKey : '';
		const resource = resolveResourceDisplay(context, resourceKey);
		const label = resource.label || resourceKey || 'Resource';
		const icon = resource.icon || resourceKey || label;
		const amount = Number(effect.params?.['amount']);
		return `${icon}${signed(-amount)}${-amount} ${label}`;
	},
});

registerEffectFormatter('resource', 'transfer', {
	summarize: (effect, context) => {
		const rawKey = effect.params?.['key'];
		const resourceKey = typeof rawKey === 'string' ? rawKey : '';
		const resource = resolveResourceDisplay(context, resourceKey);
		const icon = resource.icon || resourceKey || resource.label;
		const percent = Number(effect.params?.['percent']);
		return `Transfer ${percent}% ${icon}`;
	},
	describe: (effect, context) => {
		const rawKey = effect.params?.['key'];
		const resourceKey = typeof rawKey === 'string' ? rawKey : '';
		const resource = resolveResourceDisplay(context, resourceKey);
		const label = resource.label || resourceKey || 'Resource';
		const icon = resource.icon || resourceKey || label;
		const percent = Number(effect.params?.['percent']);
		return `Transfer ${percent}% of opponent's ${icon}${label} to you`;
	},
});
