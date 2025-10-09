import { RESOURCES } from '@kingdom-builder/contents';
import type { ResourceKey } from '@kingdom-builder/contents';
import { signed } from '../helpers';
import { registerEffectFormatter } from '../factory';

registerEffectFormatter('resource', 'add', {
	summarize: (eff) => {
		const key = eff.params?.['key'] as string;
		const resource = RESOURCES[key as ResourceKey];
		const icon = resource ? resource.icon : key;
		const amount = Number(eff.params?.['amount']);
		return `${icon}${signed(amount)}${amount}`;
	},
	describe: (eff) => {
		const key = eff.params?.['key'] as string;
		const resource = RESOURCES[key as ResourceKey];
		const label = resource?.label || key;
		const icon = resource?.icon || key;
		const amount = Number(eff.params?.['amount']);
		return `${icon}${signed(amount)}${amount} ${label}`;
	},
});

registerEffectFormatter('resource', 'remove', {
	summarize: (eff) => {
		const key = eff.params?.['key'] as string;
		const resource = RESOURCES[key as ResourceKey];
		const icon = resource ? resource.icon : key;
		const amount = Number(eff.params?.['amount']);
		return `${icon}${signed(-amount)}${-amount}`;
	},
	describe: (eff) => {
		const key = eff.params?.['key'] as string;
		const resource = RESOURCES[key as ResourceKey];
		const label = resource?.label || key;
		const icon = resource?.icon || key;
		const amount = Number(eff.params?.['amount']);
		return `${icon}${signed(-amount)}${-amount} ${label}`;
	},
});

registerEffectFormatter('resource', 'transfer', {
	summarize: (eff) => {
		const key = eff.params?.['key'] as string;
		const resource = RESOURCES[key as ResourceKey];
		const icon = resource?.icon || key;
		const percent = Number(eff.params?.['percent']);
		return `Transfer ${percent}% ${icon}`;
	},
	describe: (eff) => {
		const key = eff.params?.['key'] as string;
		const resource = RESOURCES[key as ResourceKey];
		const label = resource?.label || key;
		const icon = resource?.icon || key;
		const percent = Number(eff.params?.['percent']);
		return `Transfer ${percent}% of opponent's ${icon}${label} to you`;
	},
});
