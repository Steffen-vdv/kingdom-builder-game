import {
	MODIFIER_INFO,
	PASSIVE_INFO,
	POPULATION_INFO,
	RESOURCES,
	RESOURCE_TRANSFER_ICON,
	STATS,
} from '@kingdom-builder/contents';
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
	const populationAssets = context.assets?.population;
	const populationMap = context.assets?.populations;
	const entry = role ? populationMap?.[role] : undefined;
	let registryIcon: string | undefined;
	let registryLabel: string | undefined;
	if (role) {
		try {
			const definition = context.populations.get(role);
			registryIcon = definition.icon;
			registryLabel = definition.name;
		} catch {
			registryIcon = undefined;
			registryLabel = undefined;
		}
	}
	const populationFallback = populationAssets ?? POPULATION_INFO;
	const fallbackIcon =
		registryIcon ?? populationFallback?.icon ?? POPULATION_INFO.icon;
	const fallbackLabel =
		registryLabel ??
		populationFallback?.label ??
		POPULATION_INFO.label ??
		role ??
		'Population';
	return resolveIconLabel(
		entry,
		{ icon: fallbackIcon, label: fallbackLabel },
		fallbackLabel,
	);
}

export function resolveResourceDisplay(
	context: TranslationContext,
	key: string,
): { icon: string; label: string } {
	const entry = context.assets?.resources?.[key];
	const fallback = RESOURCES[key as keyof typeof RESOURCES];
	const icon = normalizeString(entry?.icon, fallback?.icon, key);
	const label = normalizeString(
		entry?.label,
		fallback?.label,
		fallback && 'name' in fallback
			? (fallback as { name?: string }).name
			: undefined,
		key,
	);
	return { icon, label };
}

export function resolveStatDisplay(
	context: TranslationContext,
	key: string,
): TranslationStatMetadata & { icon: string; label: string } {
	const entry = context.assets?.stats?.[key];
	const fallback = STATS[key as keyof typeof STATS];
	const icon = normalizeString(entry?.icon, fallback?.icon, key);
	const fallbackName =
		fallback && typeof fallback === 'object' && 'name' in fallback
			? (fallback as { name?: string }).name
			: undefined;
	const label = normalizeString(
		entry?.label,
		fallback?.label,
		fallbackName,
		key,
	);
	const fallbackAddFormat =
		fallback && typeof fallback === 'object' && 'addFormat' in fallback
			? (
					fallback as {
						addFormat?: TranslationStatMetadata['addFormat'];
					}
				).addFormat
			: undefined;
	const addFormat =
		entry?.addFormat ??
		(fallbackAddFormat ? { ...fallbackAddFormat } : undefined);
	return { icon, label, ...(addFormat ? { addFormat } : {}) };
}

export function resolveModifierDisplay(
	context: TranslationContext,
	modifierType: string,
): { icon: string; label: string } {
	const entry = context.assets?.modifiers?.[modifierType];
	const fallback = MODIFIER_INFO[modifierType as keyof typeof MODIFIER_INFO];
	const iconFallback = entry ? undefined : fallback?.icon;
	const icon = normalizeString(entry?.icon, iconFallback);
	const label = normalizeString(entry?.label, fallback?.label, modifierType);
	return { icon, label };
}

export function resolvePassiveDisplay(context: TranslationContext): {
	icon: string;
	label: string;
} {
	const passiveAssets = context.assets?.passive;
	const icon = normalizeString(passiveAssets?.icon, PASSIVE_INFO.icon);
	const label = normalizeString(
		passiveAssets?.label,
		PASSIVE_INFO.label,
		'Passive',
	);
	return { icon, label };
}

export function resolveResourceTransferIcon(
	context: TranslationContext,
): string {
	return (
		normalizeString(
			context.assets?.resourceTransferIcon,
			RESOURCE_TRANSFER_ICON,
		) || '🔁'
	);
}
