import { signed } from '../helpers';
import { registerEffectFormatter } from '../factory';

const DEFAULT_LAND_ICON = '🗺️';
const DEFAULT_LAND_LABEL = 'Land';
const DEFAULT_SLOT_ICON = '🧩';
const DEFAULT_SLOT_LABEL = 'Development Slot';

function resolveIcon(icon: string | undefined, fallback: string): string {
	const trimmed = icon?.trim();
	return trimmed && trimmed.length > 0 ? trimmed : fallback;
}

function resolveLabel(label: string | undefined, fallback: string): string {
	const trimmed = label?.trim();
	return trimmed && trimmed.length > 0 ? trimmed : fallback;
}

registerEffectFormatter('land', 'add', {
	summarize: (effect, context) => {
		const count = Number(effect.params?.['count'] ?? 1);
		const landAsset = context.assets.land;
		const icon = resolveIcon(landAsset.icon, DEFAULT_LAND_ICON);
		return `${icon}${signed(count)}${count}`;
	},
	describe: (effect, context) => {
		const count = Number(effect.params?.['count'] ?? 1);
		const landAsset = context.assets.land;
		const icon = resolveIcon(landAsset.icon, DEFAULT_LAND_ICON);
		const label = resolveLabel(landAsset.label, DEFAULT_LAND_LABEL);
		return `${icon} ${signed(count)}${count} ${label}`;
	},
});

registerEffectFormatter('land', 'till', {
	summarize: (_effect, context) => {
		const slotAsset = context.assets.slot;
		const slotIcon = resolveIcon(slotAsset.icon, DEFAULT_SLOT_ICON);
		return `${slotIcon}+1`;
	},
	describe: (_effect, context) => {
		const landAsset = context.assets.land;
		const slotAsset = context.assets.slot;
		const landIcon = resolveIcon(landAsset.icon, DEFAULT_LAND_ICON);
		const landLabel = resolveLabel(landAsset.label, DEFAULT_LAND_LABEL);
		const slotIcon = resolveIcon(slotAsset.icon, DEFAULT_SLOT_ICON);
		const slotLabel = resolveLabel(slotAsset.label, DEFAULT_SLOT_LABEL);
		return `Till ${landIcon} ${landLabel} to unlock ${slotIcon} ${slotLabel}`;
	},
});
