import type { TranslationContext, TranslationAssets } from '../context';
import { humanizeIdentifier } from './stringUtils';

export type RegistryDescriptor = { icon: string; label: string };

export type KeywordDescriptor = { icon: string; label: string; plural: string };

export type StatRegistryDescriptor = RegistryDescriptor & {
	format?: { prefix?: string; percent?: boolean };
};

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

function requireString(value: unknown, context: string): string {
	const result = coerceString(value);
	if (result === undefined) {
		throw new Error(`Missing required content: ${context}`);
	}
	return result;
}

type ContextWithAssets =
	| Pick<TranslationContext, 'assets'>
	| { assets?: TranslationAssets };

const populationCache: CacheStore<RegistryDescriptor> = new WeakMap();
const populationFallbackCache: CacheFallback<RegistryDescriptor> = new Map();

function resolvePopulationDescriptor(context: ContextWithAssets | undefined) {
	const assets = context?.assets;
	const icon = requireString(assets?.population?.icon, 'population.icon');
	const label = requireString(assets?.population?.label, 'population.label');
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
	const base = resolvePopulationDescriptor(context);
	if (!role) {
		cache.set(cacheKey, base);
		return base;
	}
	// Use metadata for population descriptors - use role ID directly
	const v2Context = context as {
		resourceMetadata?: {
			get?: (id: string) => { icon?: string; label?: string } | undefined;
		};
	};
	const v2Entry = v2Context.resourceMetadata?.get?.(role);
	const icon = coerceString(v2Entry?.icon) ?? base.icon;
	const fallbackLabel = humanizeIdentifier(role) || base.label;
	const label = coerceString(v2Entry?.label) ?? fallbackLabel;
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
	// Use Resource metadata for all resource lookups
	const v2Context = context as {
		resourceMetadata?: {
			get?: (id: string) => { icon?: string; label?: string } | undefined;
		};
	};
	const entry = v2Context.resourceMetadata?.get?.(key);
	const fallbackLabel = humanizeIdentifier(key) || key;
	const label = coerceString(entry?.label) ?? fallbackLabel;
	const icon = coerceString(entry?.icon) ?? '';
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
	// Use Resource metadata as the primary source
	const v2Context = context as {
		resourceMetadata?: {
			get?: (id: string) => {
				icon?: string;
				label?: string;
				displayAsPercent?: boolean;
			};
		};
	};
	const v2Entry = v2Context.resourceMetadata?.get?.(key);
	const statLabelFallback = humanizeIdentifier(key);
	const fallbackLabel =
		statLabelFallback && statLabelFallback.length > 0 ? statLabelFallback : key;
	const label = coerceString(v2Entry?.label) ?? fallbackLabel;
	const icon = coerceString(v2Entry?.icon) ?? '';
	// Derive format from metadata displayAsPercent property
	const format: { percent?: boolean } | undefined = v2Entry?.displayAsPercent
		? { percent: true }
		: undefined;
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

function resolvePassiveDescriptor(context: ContextWithAssets | undefined) {
	const assets = context?.assets;
	const icon = requireString(assets?.passive?.icon, 'passive.icon');
	const label = requireString(assets?.passive?.label, 'passive.label');
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
	const descriptor = resolvePassiveDescriptor(context);
	cache.set(cacheKey, descriptor);
	return descriptor;
}

const modifierCache: CacheStore<Record<string, RegistryDescriptor>> =
	new WeakMap();
const modifierFallbackCache: CacheFallback<Record<string, RegistryDescriptor>> =
	new Map();

function resolveModifierDescriptors(context: ContextWithAssets | undefined) {
	const assets = context?.assets;
	const cost = assets?.modifiers?.cost;
	const result = assets?.modifiers?.result;
	return {
		cost: {
			icon: requireString(cost?.icon, 'modifiers.cost.icon'),
			label: requireString(cost?.label, 'modifiers.cost.label'),
		},
		result: {
			icon: requireString(result?.icon, 'modifiers.result.icon'),
			label: requireString(result?.label, 'modifiers.result.label'),
		},
	};
}

const transferCache: CacheStore<RegistryDescriptor> = new WeakMap();
const transferFallbackCache: CacheFallback<RegistryDescriptor> = new Map();

function resolveTransferDescriptor(context: ContextWithAssets | undefined) {
	const assets = context?.assets;
	const icon = requireString(assets?.transfer?.icon, 'transfer.icon');
	const label = requireString(assets?.transfer?.label, 'transfer.label');
	return { icon, label } satisfies RegistryDescriptor;
}

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

export function selectModifierInfo(
	context: ContextWithAssets,
	kind: 'cost' | 'result',
): RegistryDescriptor {
	const cache = getCacheEntry(context, modifierCache, modifierFallbackCache);
	const cacheKey = normalizeKey(undefined);
	const cached = cache.get(cacheKey);
	const base = cached ?? resolveModifierDescriptors(context);
	if (!cached) {
		cache.set(cacheKey, base);
	}
	return base[kind];
}

// Action keyword descriptor
const actionCache: CacheStore<KeywordDescriptor> = new WeakMap();
const actionFallbackCache: CacheFallback<KeywordDescriptor> = new Map();

function resolveActionDescriptor(
	context: ContextWithAssets | undefined,
): KeywordDescriptor {
	const assets = context?.assets;
	const action = assets?.action as
		| { icon?: string; label?: string; plural?: string }
		| undefined;
	const icon = requireString(action?.icon, 'action.icon');
	const label = requireString(action?.label, 'action.label');
	const plural = requireString(action?.plural, 'action.plural');
	return { icon, label, plural };
}

export function selectActionDescriptor(
	context: ContextWithAssets,
): KeywordDescriptor {
	const cache = getCacheEntry(context, actionCache, actionFallbackCache);
	const cacheKey = normalizeKey(undefined);
	const cached = cache.get(cacheKey);
	if (cached) {
		return cached;
	}
	const descriptor = resolveActionDescriptor(context);
	cache.set(cacheKey, descriptor);
	return descriptor;
}

// Development keyword descriptor
const developmentCache: CacheStore<KeywordDescriptor> = new WeakMap();
const developmentFallbackCache: CacheFallback<KeywordDescriptor> = new Map();

function resolveDevelopmentDescriptor(
	context: ContextWithAssets | undefined,
): KeywordDescriptor {
	const assets = context?.assets;
	const development = assets?.development as
		| { icon?: string; label?: string; plural?: string }
		| undefined;
	const icon = requireString(development?.icon, 'development.icon');
	const label = requireString(development?.label, 'development.label');
	const plural = requireString(development?.plural, 'development.plural');
	return { icon, label, plural };
}

export function selectDevelopmentDescriptor(
	context: ContextWithAssets,
): KeywordDescriptor {
	const cache = getCacheEntry(
		context,
		developmentCache,
		developmentFallbackCache,
	);
	const cacheKey = normalizeKey(undefined);
	const cached = cache.get(cacheKey);
	if (cached) {
		return cached;
	}
	const descriptor = resolveDevelopmentDescriptor(context);
	cache.set(cacheKey, descriptor);
	return descriptor;
}

// Keyword labels (text-only, no icons)
export interface KeywordLabels {
	resourceGain: string;
	cost: string;
}

const keywordsCache: CacheStore<KeywordLabels> = new WeakMap();
const keywordsFallbackCache: CacheFallback<KeywordLabels> = new Map();

function resolveKeywordLabels(
	context: ContextWithAssets | undefined,
): KeywordLabels {
	const assets = context?.assets;
	const keywords = assets?.keywords as
		| { resourceGain?: string; cost?: string }
		| undefined;
	const resourceGain = requireString(
		keywords?.resourceGain,
		'keywords.resourceGain',
	);
	const cost = requireString(keywords?.cost, 'keywords.cost');
	return { resourceGain, cost };
}

export function selectKeywordLabels(context: ContextWithAssets): KeywordLabels {
	const cache = getCacheEntry(context, keywordsCache, keywordsFallbackCache);
	const cacheKey = normalizeKey(undefined);
	const cached = cache.get(cacheKey);
	if (cached) {
		return cached;
	}
	const labels = resolveKeywordLabels(context);
	cache.set(cacheKey, labels);
	return labels;
}
