import { signed } from '../helpers';
import { registerEffectFormatter } from '../factory';

registerEffectFormatter('land', 'add', {
	summarize: (effect, context) => {
		const count = Number(effect.params?.['count'] ?? 1);
		const landIcon = context.assets.land.icon ?? '🗺️';
		return `${landIcon}${signed(count)}${count}`;
	},
	describe: (effect, context) => {
		const count = Number(effect.params?.['count'] ?? 1);
		const landIcon = context.assets.land.icon ?? '🗺️';
		const landLabel = context.assets.land.label ?? 'Land';
		return `${landIcon} ${signed(count)}${count} ${landLabel}`;
	},
});

registerEffectFormatter('land', 'till', {
	summarize: (_effect, context) => {
		const slotIcon = context.assets.slot.icon ?? '🧩';
		return `${slotIcon}+1`;
	},
	describe: (_effect, context) => {
		const landIcon = context.assets.land.icon ?? '🗺️';
		const landLabel = context.assets.land.label ?? 'Land';
		const slotIcon = context.assets.slot.icon ?? '🧩';
		const slotLabel = context.assets.slot.label ?? 'Development Slot';
		return `Till ${landIcon} ${landLabel} to unlock ${slotIcon} ${slotLabel}`;
	},
});
