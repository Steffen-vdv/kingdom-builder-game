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
const DEFAULT_TRANSFER_ICON = '🔁';
const DEFAULT_TRANSFER_LABEL = 'Transfer';

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

/**
 * Selects the registry descriptor for a population role.
 *
 * Resolves an icon and label from the provided translation assets (falling back to defaults and a humanized role name as needed) and caches the result per context and role.
 *
 * @param context - Translation context or assets container used to resolve descriptors
 * @param role - Population role identifier; when `undefined` the default population descriptor is returned
 * @returns The resolved `RegistryDescriptor` containing `icon` and `label`
 */
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

/**
 * Compute a stat display format from a stat asset entry.
 *
 * @param entry - The stat asset definition (may be undefined); its `format` (string or object) and `displayAsPercent` fields are consulted.
 * @returns An object containing `prefix` and/or `percent` when specified by the entry, or `undefined` if no format applies.
 */
function resolveStatFormat(
	entry: TranslationAssets['stats'][string] | undefined,
): { prefix?: string; percent?: boolean } | undefined {
	if (!entry) {
		return undefined;
	}
	const descriptor = entry.format;
	let prefix: string | undefined;
	let percent: boolean | undefined;
	if (typeof descriptor === 'string') {
		if (descriptor.trim().length > 0) {
			prefix = descriptor;
		}
	} else if (descriptor && typeof descriptor === 'object') {
		const formatted = descriptor as { prefix?: unknown; percent?: unknown };
		if (
			typeof formatted.prefix === 'string' &&
			formatted.prefix.trim().length > 0
		) {
			prefix = formatted.prefix;
		}
		if (typeof formatted.percent === 'boolean') {
			percent = formatted.percent;
		}
	}
	if (percent === undefined && entry.displayAsPercent === true) {
		percent = true;
	}
	if (prefix === undefined && percent === undefined) {
		return undefined;
	}
	const format: { prefix?: string; percent?: boolean } = {};
	if (prefix !== undefined) {
		format.prefix = prefix;
	}
	if (percent !== undefined) {
		format.percent = percent;
	}
	return format;
}

/**
 * Selects or constructs a stat registry descriptor for the given stat key using translation assets and per-context caching.
 *
 * @param key - The stat identifier used to look up asset overrides and generate fallbacks
 * @returns A `StatRegistryDescriptor` containing `icon`, `label`, and an optional `format`; `label` falls back to a humanized form of `key` and `icon` falls back to `key` when assets are not provided
 */
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
	const statLabelFallback = humanizeIdentifier(key);
	const fallbackLabel =
		statLabelFallback && statLabelFallback.length > 0 ? statLabelFallback : key;
	const label = coerceLabel(entry?.label, fallbackLabel);
	const icon = coerceIcon(entry?.icon, key);
	const format = resolveStatFormat(entry);
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

/**
 * Produce default modifier descriptors for "cost" and "result" using translation assets when available.
 *
 * @param context - Optional translation context whose `assets.modifiers` entries override descriptor fields; when omitted or missing fields, defaults are used.
 * @returns An object with `cost` and `result` descriptors; each descriptor contains `icon` and `label` strings derived from the assets or fallback defaults.
 */
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

const transferCache: CacheStore<RegistryDescriptor> = new WeakMap();
const transferFallbackCache: CacheFallback<RegistryDescriptor> = new Map();

/**
 * Resolve the transfer descriptor from the provided translation assets, falling back to defaults when missing.
 *
 * @returns The transfer registry descriptor containing `icon` and `label`
 */
function resolveTransferDescriptor(context: ContextWithAssets | undefined) {
	const assets = context?.assets;
	const icon = coerceIcon(assets?.transfer?.icon, DEFAULT_TRANSFER_ICON);
	const label = coerceLabel(assets?.transfer?.label, DEFAULT_TRANSFER_LABEL);
	return { icon, label } satisfies RegistryDescriptor;
}

/**
 * Selects the transfer registry descriptor for the given translation context.
 *
 * @param context - Context containing translation assets used to resolve the descriptor
 * @returns The transfer RegistryDescriptor with `icon` and `label` resolved from the context's assets
 */
export function selectTransferDescriptor(
	context: ContextWithAssets,
): RegistryDescriptor {
	const cache = getCacheEntry(context, transferCache, transferFallbackCache);
	const cacheKey = normalizeKey(undefined);
	const cached = cache.get(cacheKey);
	if (cached) {
		return cached;
	}
	const descriptor = resolveTransferDescriptor(context);
	cache.set(cacheKey, descriptor);
	return descriptor;
}

/**
 * Selects the registry descriptor for a modifier kind ('cost' or 'result') from translation assets and caches resolved values.
 *
 * @param context - Translation assets and context used to resolve descriptors
 * @param kind - Which modifier descriptor to retrieve: `'cost'` or `'result'`
 * @returns The resolved `RegistryDescriptor` for the requested modifier kind
 */
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