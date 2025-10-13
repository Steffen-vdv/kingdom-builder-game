import { signed } from '../helpers';
import { registerEffectFormatter } from '../factory';

registerEffectFormatter('land', 'add', {
	summarize: (effect, context) => {
		const count = Number(effect.params?.['count'] ?? 1);
		const landAsset = context.assets?.land ?? { icon: '🗺️' };
		const icon = landAsset.icon ?? '🗺️';
		return `${icon}${signed(count)}${count}`;
	},
	describe: (effect, context) => {
		const count = Number(effect.params?.['count'] ?? 1);
		const landAsset = context.assets?.land ?? { icon: '🗺️', label: 'Land' };
		const icon = landAsset.icon ?? '🗺️';
		const label = landAsset.label ?? 'Land';
		return `${icon} ${signed(count)}${count} ${label}`;
	},
});

registerEffectFormatter('land', 'till', {
	summarize: (_, context) => {
		const slotAsset = context.assets?.slot ?? { icon: '🧩' };
		const icon = slotAsset.icon ?? '🧩';
		return `${icon}+1`;
	},
	describe: (_, context) => {
		const landAsset = context.assets?.land ?? { icon: '🗺️', label: 'Land' };
		const slotAsset = context.assets?.slot ?? {
			icon: '🧩',
			label: 'Development Slot',
		};
		const landIcon = landAsset.icon ?? '🗺️';
		const landLabel = landAsset.label ?? 'Land';
		const slotIcon = slotAsset.icon ?? '🧩';
		const slotLabel = slotAsset.label ?? 'Development Slot';
		return `Till ${landIcon} ${landLabel} to unlock ${slotIcon} ${slotLabel}`;
	},
});
