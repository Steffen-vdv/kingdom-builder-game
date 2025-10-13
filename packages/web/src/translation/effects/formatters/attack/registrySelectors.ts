import {
	BUILDINGS,
	RESOURCES,
	STATS,
	type ResourceKey,
	type StatKey,
} from '@kingdom-builder/contents';
import type { TranslationContext } from '../../../context';

export type AttackRegistryDescriptor = { icon: string; label: string };

const translationContextStack: TranslationContext[] = [];

function deriveFallbackLabel(key: string): string {
	const normalized = String(key ?? '');
	const base = normalized.split(':').pop() ?? normalized;
	const withSeparators = base.replace(/[_-]+/g, ' ');
	const spacedCamel = withSeparators
		.replace(/([a-z0-9])([A-Z])/g, '$1 $2')
		.replace(/([A-Z])([A-Z][a-z])/g, '$1 $2');
	const rawWords = spacedCamel.trim().split(/\s+/).filter(Boolean);
	if (rawWords.length === 0) {
		return base || normalized;
	}
	const collapsed: string[] = [];
	for (const word of rawWords) {
		if (/^[A-Z]$/.test(word)) {
			const previous = collapsed[collapsed.length - 1];
			if (previous && /^[A-Z0-9]+$/.test(previous)) {
				collapsed[collapsed.length - 1] = `${previous}${word}`;
				continue;
			}
		}
		collapsed.push(word);
	}
	const formatted = collapsed.map((word) => {
		if (/^[A-Z0-9]+$/.test(word)) {
			return word;
		}
		const lower = word.toLowerCase();
		return lower.charAt(0).toUpperCase() + lower.slice(1);
	});
	return formatted.join(' ');
}

function isPromise<T>(value: T | Promise<T>): value is Promise<T> {
	return (
		typeof value === 'object' &&
		value !== null &&
		'then' in (value as Record<string, unknown>) &&
		typeof (value as { then: unknown }).then === 'function'
	);
}

function getActiveTranslationContext(): TranslationContext | undefined {
	const index = translationContextStack.length - 1;
	return index >= 0 ? translationContextStack[index] : undefined;
}

export function withAttackTranslationContext<TReturn>(
	context: TranslationContext,
	callback: () => TReturn,
): TReturn {
	translationContextStack.push(context);
	try {
		const result = callback();
		if (isPromise(result)) {
			return result.finally(() => {
				translationContextStack.pop();
			}) as TReturn;
		}
		translationContextStack.pop();
		return result;
	} catch (error) {
		translationContextStack.pop();
		throw error;
	}
}

function coerceLabel(value: string | undefined, fallback: string): string {
	if (!value) {
		return fallback;
	}
	const trimmed = value.trim();
	return trimmed.length > 0 ? trimmed : fallback;
}

function coerceIcon(icon: string | undefined): string {
	return icon ? icon : '';
}

function toDescriptor(
	label: string | undefined,
	icon: string | undefined,
	fallback: string,
): AttackRegistryDescriptor {
	return {
		icon: coerceIcon(icon),
		label: coerceLabel(label, fallback),
	};
}

export function selectAttackResourceDescriptor(
	resourceKey: string,
): AttackRegistryDescriptor {
	const fallbackLabel = deriveFallbackLabel(resourceKey);
	const translation = getActiveTranslationContext();
	const resourceAssets = translation?.assets?.resources;
	const assetEntry = resourceAssets ? resourceAssets[resourceKey] : undefined;
	const assetLabel = assetEntry?.label;
	const assetIcon = assetEntry?.icon;
	const definition = RESOURCES[resourceKey as ResourceKey];
	const label = assetLabel ?? definition?.label;
	const icon = assetIcon ?? definition?.icon;
	return toDescriptor(label, icon, fallbackLabel);
}

export function selectAttackStatDescriptor(
	statKey: string,
): AttackRegistryDescriptor {
	const fallbackLabel = deriveFallbackLabel(statKey);
	const translation = getActiveTranslationContext();
	const statAssets = translation?.assets?.stats;
	const assetEntry = statAssets ? statAssets[statKey] : undefined;
	const assetLabel = assetEntry?.label;
	const assetIcon = assetEntry?.icon;
	const definition = STATS[statKey as StatKey];
	const label = assetLabel ?? definition?.label;
	const icon = assetIcon ?? definition?.icon;
	return toDescriptor(label, icon, fallbackLabel);
}

export function selectAttackBuildingDescriptor(
	buildingId: string,
): AttackRegistryDescriptor {
	const fallbackLabel = deriveFallbackLabel(buildingId);
	const translation = getActiveTranslationContext();
	if (translation) {
		try {
			const entry = translation.buildings.get(buildingId);
			return toDescriptor(entry.name, entry.icon, fallbackLabel);
		} catch {
			/* fall back to contents registry */
		}
	}
	try {
		const definition = BUILDINGS.get(buildingId);
		return toDescriptor(definition.name, definition.icon, fallbackLabel);
	} catch {
		return { icon: '', label: fallbackLabel };
	}
}

export function listAttackResourceKeys(): ReadonlyArray<ResourceKey> {
	const translation = getActiveTranslationContext();
	const assetKeys = translation
		? Object.keys(translation.assets.resources)
		: [];
	if (assetKeys.length > 0) {
		return Object.freeze(assetKeys as ReadonlyArray<ResourceKey>);
	}
	return Object.freeze(Object.keys(RESOURCES) as ReadonlyArray<ResourceKey>);
}

export function listAttackStatKeys(): ReadonlyArray<StatKey> {
	const translation = getActiveTranslationContext();
	const assetKeys = translation ? Object.keys(translation.assets.stats) : [];
	if (assetKeys.length > 0) {
		return Object.freeze(assetKeys as ReadonlyArray<StatKey>);
	}
	return Object.freeze(Object.keys(STATS) as ReadonlyArray<StatKey>);
}

export function listAttackBuildingIds(): ReadonlyArray<string> {
	return Object.freeze(BUILDINGS.keys().slice());
}

export function selectAttackDefaultStatKey(): StatKey | undefined {
	const translation = getActiveTranslationContext();
	if (translation) {
		const assetKeys = Object.keys(translation.assets.stats) as StatKey[];
		if (assetKeys.length > 0) {
			return assetKeys[0];
		}
	}
	const keys = listAttackStatKeys();
	return keys.length > 0 ? keys[0] : undefined;
}

export function selectAttackDefaultBuildingId(): string | undefined {
	const ids = listAttackBuildingIds();
	return ids.length > 0 ? ids[0] : undefined;
}
