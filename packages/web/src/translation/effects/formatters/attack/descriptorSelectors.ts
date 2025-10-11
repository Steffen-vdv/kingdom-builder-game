import type { TranslationContext } from '../../../context';
import type { TargetInfo } from './types';

const UNKNOWN_ICON = '';

const formatIdLabel = (value: string): string => {
	const spaced = value.replace(/[_:-]+/g, ' ').trim();
	if (spaced.length === 0) {
		return value;
	}
	return spaced.replace(/\b\w/g, (char) => char.toUpperCase());
};

const toTargetInfo = (
	label: string | undefined,
	icon: string | undefined,
	fallback: string,
): TargetInfo => ({
	label: label ?? fallback,
	icon: icon ?? UNKNOWN_ICON,
});

export const selectResourceInfo = (
	context: TranslationContext,
	key: string,
): TargetInfo => {
	const descriptor = context.assets.resources[key];
	return toTargetInfo(descriptor?.label, descriptor?.icon, formatIdLabel(key));
};

export const selectStatInfo = (
	context: TranslationContext,
	key: string,
): TargetInfo => {
	const descriptor = context.assets.stats[key];
	return toTargetInfo(descriptor?.label, descriptor?.icon, formatIdLabel(key));
};

export const selectBuildingInfo = (
	context: TranslationContext,
	id: string,
): TargetInfo => {
	try {
		const definition = context.buildings.get(id) as {
			icon?: string | undefined;
			name?: string | undefined;
		};
		return toTargetInfo(definition?.name, definition?.icon, formatIdLabel(id));
	} catch {
		return toTargetInfo(undefined, undefined, formatIdLabel(id));
	}
};
