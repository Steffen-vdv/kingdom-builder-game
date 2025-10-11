import type { TranslationContext, TranslationStatMetadata } from '../context';

export const signed = (n: number): string => (n >= 0 ? '+' : '');
export const gainOrLose = (n: number): string => (n >= 0 ? 'Gain' : 'Lose');
export const increaseOrDecrease = (n: number): string =>
	n >= 0 ? 'Increase' : 'Decrease';

const normalizeString = (...candidates: Array<string | undefined>): string => {
	for (const candidate of candidates) {
		if (typeof candidate === 'string' && candidate.trim().length > 0) {
			return candidate;
		}
	}
	return '';
};

const resolveIconLabel = (
	entry: { icon?: string; label?: string } | undefined,
	fallback: { icon?: string; label?: string } | undefined,
	fallbackLabel: string,
): { icon: string; label: string } => {
	const icon = normalizeString(entry?.icon, fallback?.icon);
	const label = normalizeString(entry?.label, fallback?.label, fallbackLabel);
	return { icon, label };
};

export function resolvePopulationDisplay(
	context: TranslationContext,
	role: string | undefined,
): {
	icon: string;
	label: string;
} {
	const populationAssets = context.assets.population;
	const entry = role ? context.assets.populations[role] : undefined;
	return resolveIconLabel(entry, populationAssets, role ?? 'Population');
}

export function resolveResourceDisplay(
	context: TranslationContext,
	key: string,
): { icon: string; label: string } {
	const entry = context.assets.resources[key];
	const icon = normalizeString(entry?.icon, key);
	const label = normalizeString(entry?.label, key);
	return { icon, label };
}

export function resolveStatDisplay(
	context: TranslationContext,
	key: string,
): TranslationStatMetadata & { icon: string; label: string } {
	const entry = context.assets.stats[key];
	const icon = normalizeString(entry?.icon, key);
	const label = normalizeString(entry?.label, key);
	const addFormat = entry?.addFormat;
	return { icon, label, ...(addFormat ? { addFormat } : {}) };
}

export function resolveModifierDisplay(
	context: TranslationContext,
	modifierType: string,
): { icon: string; label: string } {
	const entry = context.assets.modifiers[modifierType];
	const icon = normalizeString(entry?.icon);
	const label = normalizeString(entry?.label, modifierType);
	return { icon, label };
}

export function resolvePassiveDisplay(context: TranslationContext): {
	icon: string;
	label: string;
} {
	const passiveAssets = context.assets.passive;
	const icon = normalizeString(passiveAssets.icon);
	const label = normalizeString(passiveAssets.label, 'Passive');
	return { icon, label };
}

export function resolveResourceTransferIcon(
	context: TranslationContext,
): string {
	return normalizeString(context.assets.resourceTransferIcon) || '🔁';
}
