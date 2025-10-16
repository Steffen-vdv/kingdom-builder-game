import { signed } from '../helpers';
import { registerEffectFormatter } from '../factory';

registerEffectFormatter('land', 'add', {
	summarize: (effect, context) => {
		const count = Number(effect.params?.['count'] ?? 1);
		const landInfo = context.assets.land;
		const icon = landInfo.icon ?? '🗺️';
		return `${icon}${signed(count)}${count}`;
	},
	describe: (effect, context) => {
		const count = Number(effect.params?.['count'] ?? 1);
		const landInfo = context.assets.land;
		const icon = landInfo.icon ?? '🗺️';
		const label = landInfo.label ?? 'Land';
		return `${icon} ${signed(count)}${count} ${label}`;
	},
});

registerEffectFormatter('land', 'till', {
	summarize: (_, context) => {
		const slotInfo = context.assets.slot;
		const icon = slotInfo.icon ?? '🧩';
		return `${icon}+1`;
	},
	describe: (_, context) => {
		const landInfo = context.assets.land;
		const slotInfo = context.assets.slot;
		const landIcon = landInfo.icon ?? '🗺️';
		const landLabel = landInfo.label ?? 'Land';
		const slotIcon = slotInfo.icon ?? '🧩';
		const slotLabel = slotInfo.label ?? 'Development Slot';
		return `Till ${landIcon} ${landLabel} to unlock ${slotIcon} ${slotLabel}`;
	},
});
