import { signed } from '../helpers';
import { registerEffectFormatter } from '../factory';

const DEFAULT_LAND_ICON = '🗺️';
const DEFAULT_LAND_LABEL = 'Land';
const DEFAULT_SLOT_ICON = '🧩';
const DEFAULT_SLOT_LABEL = 'Development Slot';

function coerceIcon(value: unknown, fallback: string): string {
	return typeof value === 'string' && value.trim().length > 0
		? value
		: fallback;
}

function coerceLabel(value: unknown, fallback: string): string {
	return typeof value === 'string' && value.trim().length > 0
		? value
		: fallback;
}

registerEffectFormatter('land', 'add', {
	summarize: (effect, context) => {
		const count = Number(effect.params?.['count'] ?? 1);
		const land = context.assets?.land;
		const icon = coerceIcon(land?.icon, DEFAULT_LAND_ICON);
		return `${icon}${signed(count)}${count}`;
	},
	describe: (effect, context) => {
		const count = Number(effect.params?.['count'] ?? 1);
		const land = context.assets?.land;
		const icon = coerceIcon(land?.icon, DEFAULT_LAND_ICON);
		const label = coerceLabel(land?.label, DEFAULT_LAND_LABEL);
		return `${icon} ${signed(count)}${count} ${label}`;
	},
});

registerEffectFormatter('land', 'till', {
	summarize: (_effect, context) => {
		const slot = context.assets?.slot;
		const icon = coerceIcon(slot?.icon, DEFAULT_SLOT_ICON);
		return `${icon}+1`;
	},
	describe: (_effect, context) => {
		const land = context.assets?.land;
		const slot = context.assets?.slot;
		const landIcon = coerceIcon(land?.icon, DEFAULT_LAND_ICON);
		const landLabel = coerceLabel(land?.label, DEFAULT_LAND_LABEL);
		const slotIcon = coerceIcon(slot?.icon, DEFAULT_SLOT_ICON);
		const slotLabel = coerceLabel(slot?.label, DEFAULT_SLOT_LABEL);
		return `Till ${landIcon} ${landLabel} to unlock ${slotIcon} ${slotLabel}`;
	},
});
