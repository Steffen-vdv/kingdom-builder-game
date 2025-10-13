import type { TranslationContext, TranslationAssets } from '../context';
import { humanizeIdentifier } from './stringUtils';

export type RegistryDescriptor = { icon: string; label: string };

export type StatRegistryDescriptor = RegistryDescriptor & {
	format?: { prefix?: string; percent?: boolean };
};

const DEFAULT_POPULATION_ICON = '👥';
const DEFAULT_POPULATION_LABEL = 'Population';
const DEFAULT_PASSIVE_ICON = '♾️';
const DEFAULT_PASSIVE_LABEL = 'Passive';
const DEFAULT_COST_ICON = '💲';
const DEFAULT_COST_LABEL = 'Cost Adjustment';
const DEFAULT_RESULT_ICON = '✨';
const DEFAULT_RESULT_LABEL = 'Outcome Adjustment';

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
	role: string | undefined,
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
	const fallbackLabel = humanizeIdentifier(key) || key;
	const label = coerceLabel(entry?.label, fallbackLabel);
	const icon = coerceIcon(entry?.icon, key);
	const percentFlag = entry?.displayAsPercent === true;
	const format = percentFlag ? { percent: true } : undefined;
	const descriptor: StatRegistryDescriptor = format
		? { icon, label, format }
		: { icon, label };
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
	const cost = assets?.modifiers?.cost ?? {};
	const result = assets?.modifiers?.result ?? {};
	return {
		cost: {
			icon: coerceIcon(cost.icon, DEFAULT_COST_ICON),
			label: coerceLabel(cost.label, DEFAULT_COST_LABEL),
		},
		result: {
			icon: coerceIcon(result.icon, DEFAULT_RESULT_ICON),
			label: coerceLabel(result.label, DEFAULT_RESULT_LABEL),
		},
	};
}

export function selectModifierInfo(
	context: ContextWithAssets,
	kind: 'cost' | 'result',
): RegistryDescriptor {
	const cache = getCacheEntry(context, modifierCache, modifierFallbackCache);
	const cacheKey = normalizeKey(undefined);
	const cached = cache.get(cacheKey);
	const base = cached ?? resolveModifierFallback(context);
	if (!cached) {
		cache.set(cacheKey, base);
	}
	const descriptor = base[kind];
	if (descriptor) {
		return descriptor;
	}
	const fallback = resolveModifierFallback(context)[kind];
	cache.set(cacheKey, { ...base, [kind]: fallback });
	return fallback;
}
