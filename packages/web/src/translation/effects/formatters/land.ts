import { signed } from '../helpers';
import { registerEffectFormatter } from '../factory';

registerEffectFormatter('land', 'add', {
	summarize: (effect, context) => {
		const landAsset = context.assets.land;
		const icon = landAsset?.icon ?? '🗺️';
		const count = Number(effect.params?.['count'] ?? 1);
		return `${icon}${signed(count)}${count}`;
	},
	describe: (effect, context) => {
		const landAsset = context.assets.land;
		const icon = landAsset?.icon ? `${landAsset.icon} ` : '';
		const label = landAsset?.label ?? 'Land';
		const count = Number(effect.params?.['count'] ?? 1);
		return `${icon}${signed(count)}${count} ${label}`;
	},
});

registerEffectFormatter('land', 'till', {
	summarize: (_effect, context) => {
		const slotAsset = context.assets.slot;
		const icon = slotAsset?.icon ?? '🧩';
		return `${icon}+1`;
	},
	describe: (_effect, context) => {
		const landAsset = context.assets.land;
		const slotAsset = context.assets.slot;
		const landIcon = landAsset?.icon ? `${landAsset.icon} ` : '';
		const landLabel = landAsset?.label ?? 'Land';
		const slotIcon = slotAsset?.icon ? `${slotAsset.icon} ` : '';
		const slotLabel = slotAsset?.label ?? 'Development Slot';
		return `Till ${landIcon}${landLabel} to unlock ${slotIcon}${slotLabel}`;
	},
});
