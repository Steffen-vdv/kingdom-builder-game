import { RESOURCES } from '@kingdom-builder/contents';
import type { ResourceKey } from '@kingdom-builder/contents';
import { signed } from '../helpers';
import { registerEffectFormatter } from '../factory';

registerEffectFormatter('resource', 'add', {
	summarize: (effect) => {
		const key = effect.params?.['key'] as string;
		const resource = RESOURCES[key as ResourceKey];
		const icon = resource ? resource.icon : key;
		const amount = Number(effect.params?.['amount']);
		return `${icon}${signed(amount)}${amount}`;
	},
	describe: (effect) => {
		const key = effect.params?.['key'] as string;
		const resource = RESOURCES[key as ResourceKey];
		const label = resource?.label || key;
		const icon = resource?.icon || key;
		const amount = Number(effect.params?.['amount']);
		return `${icon}${signed(amount)}${amount} ${label}`;
	},
});

registerEffectFormatter('resource', 'remove', {
	summarize: (effect) => {
		const key = effect.params?.['key'] as string;
		const resource = RESOURCES[key as ResourceKey];
		const icon = resource ? resource.icon : key;
		const amount = Number(effect.params?.['amount']);
		return `${icon}${signed(-amount)}${-amount}`;
	},
	describe: (effect) => {
		const key = effect.params?.['key'] as string;
		const resource = RESOURCES[key as ResourceKey];
		const label = resource?.label || key;
		const icon = resource?.icon || key;
		const amount = Number(effect.params?.['amount']);
		return `${icon}${signed(-amount)}${-amount} ${label}`;
	},
});

registerEffectFormatter('resource', 'transfer', {
	summarize: (effect) => {
		const key = effect.params?.['key'] as string;
		const resource = RESOURCES[key as ResourceKey];
		const icon = resource?.icon || key;
		const percent = Number(effect.params?.['percent']);
		return `Transfer ${percent}% ${icon}`;
	},
	describe: (effect) => {
		const key = effect.params?.['key'] as string;
		const resource = RESOURCES[key as ResourceKey];
		const label = resource?.label || key;
		const icon = resource?.icon || key;
		const percent = Number(effect.params?.['percent']);
		return `Transfer ${percent}% of opponent's ${icon}${label} to you`;
	},
});
