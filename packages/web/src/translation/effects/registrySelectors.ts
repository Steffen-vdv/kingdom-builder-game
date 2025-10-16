import {
	STATS,
	type PopulationRoleId,
	type StatKey,
} from '@kingdom-builder/contents';
import type {
	TranslationContext,
	TranslationAssets,
	TranslationModifierInfo,
} from '../context';
import { DEFAULT_MODIFIER_INFO } from '../context/assets';
import { humanizeIdentifier } from './stringUtils';

export type RegistryDescriptor = { icon: string; label: string };

export type StatRegistryDescriptor = RegistryDescriptor & {
	format?: { prefix?: string; percent?: boolean };
};

const DEFAULT_POPULATION_ICON = '👥';
const DEFAULT_POPULATION_LABEL = 'Population';
const DEFAULT_PASSIVE_ICON = '♾️';
const DEFAULT_PASSIVE_LABEL = 'Passive';

const DEFAULT_KEY = Symbol('default');

type CacheKey = string | typeof DEFAULT_KEY;

type CacheStore<T> = WeakMap<object, Map<CacheKey, T>>;

type CacheFallback<T> = Map<CacheKey, T>;

function getCacheEntry<T>(
	context: unknown,
	store: CacheStore<T>,
	fallback: CacheFallback<T>,
): Map<CacheKey, T> {
	if (typeof context === 'object' && context !== null) {
		let cache = store.get(context);
		if (!cache) {
			cache = new Map();
			store.set(context, cache);
		}
		return cache;
	}
	return fallback;
}

function normalizeKey(key: string | undefined): CacheKey {
	return key === undefined ? DEFAULT_KEY : key;
}

function coerceString(value: unknown): string | undefined {
	if (typeof value !== 'string') {
		return undefined;
	}
	const trimmed = value.trim();
	return trimmed.length > 0 ? trimmed : undefined;
}

function coerceIcon(icon: unknown, fallback: string): string {
	return coerceString(icon) ?? fallback;
}

function coerceLabel(label: unknown, fallback: string): string {
	return coerceString(label) ?? fallback;
}

type ContextWithAssets =
	| Pick<TranslationContext, 'assets'>
	| { assets?: TranslationAssets };

const populationCache: CacheStore<RegistryDescriptor> = new WeakMap();
const populationFallbackCache: CacheFallback<RegistryDescriptor> = new Map();

function resolvePopulationFallback(context: ContextWithAssets | undefined) {
	const assets = context?.assets;
	const icon = coerceIcon(assets?.population?.icon, DEFAULT_POPULATION_ICON);
	const label = coerceLabel(
		assets?.population?.label,
		DEFAULT_POPULATION_LABEL,
	);
	return { icon, label } satisfies RegistryDescriptor;
}

export function selectPopulationDescriptor(
	context: ContextWithAssets,
	role: PopulationRoleId | undefined,
): RegistryDescriptor {
	const cache = getCacheEntry(
		context,
		populationCache,
		populationFallbackCache,
	);
	const cacheKey = normalizeKey(role);
	const cached = cache.get(cacheKey);
	if (cached) {
		return cached;
	}
	const fallback = resolvePopulationFallback(context);
	if (!role) {
		cache.set(cacheKey, fallback);
		return fallback;
	}
	const assets = context.assets;
	const entry = assets?.populations?.[role];
	const icon = coerceIcon(entry?.icon, fallback.icon);
	const fallbackLabel = humanizeIdentifier(role) || fallback.label;
	const label = coerceLabel(entry?.label, fallbackLabel);
	const descriptor = { icon, label } satisfies RegistryDescriptor;
	cache.set(cacheKey, descriptor);
	return descriptor;
}

const resourceCache: CacheStore<RegistryDescriptor> = new WeakMap();
const resourceFallbackCache: CacheFallback<RegistryDescriptor> = new Map();

export function selectResourceDescriptor(
	context: ContextWithAssets,
	key: string,
): RegistryDescriptor {
	const cache = getCacheEntry(context, resourceCache, resourceFallbackCache);
	const cacheKey = normalizeKey(key);
	const cached = cache.get(cacheKey);
	if (cached) {
		return cached;
	}
	const assets = context.assets;
	const entry = assets?.resources?.[key];
	const fallbackLabel = humanizeIdentifier(key) || key;
	const label = coerceLabel(entry?.label, fallbackLabel);
	const icon = coerceIcon(entry?.icon, '');
	const descriptor = { icon, label } satisfies RegistryDescriptor;
	cache.set(cacheKey, descriptor);
	return descriptor;
}

const statCache: CacheStore<StatRegistryDescriptor> = new WeakMap();
const statFallbackCache: CacheFallback<StatRegistryDescriptor> = new Map();

export function selectStatDescriptor(
	context: ContextWithAssets,
	key: string,
): StatRegistryDescriptor {
	const cache = getCacheEntry(context, statCache, statFallbackCache);
	const cacheKey = normalizeKey(key);
	const cached = cache.get(cacheKey);
	if (cached) {
		return cached;
	}
	const assets = context.assets;
	const entry = assets?.stats?.[key];
	const statDef = STATS[key as StatKey];
	const statLabelFallback = statDef?.label ?? humanizeIdentifier(key);
	const fallbackLabel =
		statLabelFallback && statLabelFallback.length > 0 ? statLabelFallback : key;
	const label = coerceLabel(entry?.label ?? statDef?.label, fallbackLabel);
	const icon = coerceIcon(entry?.icon ?? statDef?.icon, key);
	const format = statDef?.addFormat ? { ...statDef.addFormat } : undefined;
	const descriptor: StatRegistryDescriptor = {
		icon,
		label,
		...(format ? { format } : {}),
	};
	cache.set(cacheKey, descriptor);
	return descriptor;
}

const passiveCache: CacheStore<RegistryDescriptor> = new WeakMap();
const passiveFallbackCache: CacheFallback<RegistryDescriptor> = new Map();

function resolvePassiveFallback(context: ContextWithAssets | undefined) {
	const assets = context?.assets;
	const icon = coerceIcon(assets?.passive?.icon, DEFAULT_PASSIVE_ICON);
	const label = coerceLabel(assets?.passive?.label, DEFAULT_PASSIVE_LABEL);
	return { icon, label } satisfies RegistryDescriptor;
}

export function selectPassiveDescriptor(
	context: ContextWithAssets,
): RegistryDescriptor {
	const cache = getCacheEntry(context, passiveCache, passiveFallbackCache);
	const cacheKey = normalizeKey(undefined);
	const cached = cache.get(cacheKey);
	if (cached) {
		return cached;
	}
	const fallback = resolvePassiveFallback(context);
	cache.set(cacheKey, fallback);
	return fallback;
}

const modifierCache: CacheStore<Record<string, RegistryDescriptor>> =
	new WeakMap();
const modifierFallbackCache: CacheFallback<Record<string, RegistryDescriptor>> =
	new Map();

function resolveModifierFallback(context: ContextWithAssets | undefined) {
	const assets = context?.assets;
	const modifierAssets: Readonly<Record<string, TranslationModifierInfo>> =
		assets?.modifiers ??
		(Object.create(null) as Readonly<Record<string, TranslationModifierInfo>>);
	const defaults = DEFAULT_MODIFIER_INFO;
	const descriptors: Record<string, RegistryDescriptor> = {};
	for (const [key, defaultInfo] of Object.entries(defaults)) {
		const fallbackIcon = defaultInfo.icon ?? '';
		const fallbackLabel = defaultInfo.label ?? (humanizeIdentifier(key) || key);
		const assetInfo = modifierAssets[key];
		const icon = coerceIcon(assetInfo?.icon ?? defaultInfo.icon, fallbackIcon);
		const label = coerceLabel(
			assetInfo?.label ?? defaultInfo.label,
			fallbackLabel,
		);
		descriptors[key] = { icon, label } satisfies RegistryDescriptor;
	}
	for (const [key, assetInfo] of Object.entries(modifierAssets)) {
		if (Object.prototype.hasOwnProperty.call(descriptors, key)) {
			continue;
		}
		const fallbackLabel = humanizeIdentifier(key) || key;
		const icon = coerceIcon(assetInfo?.icon, '');
		const label = coerceLabel(assetInfo?.label, fallbackLabel);
		descriptors[key] = { icon, label } satisfies RegistryDescriptor;
	}
	return descriptors;
}

export function selectModifierInfo(
	context: ContextWithAssets,
	kind: string,
): RegistryDescriptor {
	const cache = getCacheEntry(context, modifierCache, modifierFallbackCache);
	const cacheKey = normalizeKey(undefined);
	let base = cache.get(cacheKey);
	if (!base) {
		base = resolveModifierFallback(context);
		cache.set(cacheKey, base);
	}
	const descriptor = base[kind];
	if (descriptor) {
		return descriptor;
	}
	const fallback = createModifierDescriptor(context, kind);
	const next = { ...base, [kind]: fallback };
	cache.set(cacheKey, next);
	return fallback;
}

function createModifierDescriptor(
	context: ContextWithAssets | undefined,
	kind: string,
): RegistryDescriptor {
	const modifierAssets = context?.assets?.modifiers ?? {};
	const assetInfo = modifierAssets[kind];
	const fallbackLabel = humanizeIdentifier(kind) || kind;
	const icon = coerceIcon(assetInfo?.icon, '');
	const label = coerceLabel(assetInfo?.label, fallbackLabel);
	return { icon, label } satisfies RegistryDescriptor;
}
