import {
	STATS,
	type PopulationRoleId,
	type StatKey,
} from '@kingdom-builder/contents';
import type {
	TranslationAssets,
	TranslationContext,
	TranslationModifierInfo,
} from '../context';
import { RESOURCE_TRANSFER_ICON } from '../../icons';
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
const DEFAULT_TRANSFER_ICON = RESOURCE_TRANSFER_ICON;
const DEFAULT_TRANSFER_LABEL = 'Transfer Adjustment';

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

const DEFAULT_MODIFIER_DESCRIPTOR_MAP: ReadonlyMap<string, RegistryDescriptor> =
	new Map([
		['cost', { icon: DEFAULT_COST_ICON, label: DEFAULT_COST_LABEL }],
		['result', { icon: DEFAULT_RESULT_ICON, label: DEFAULT_RESULT_LABEL }],
		[
			'transfer',
			{ icon: DEFAULT_TRANSFER_ICON, label: DEFAULT_TRANSFER_LABEL },
		],
	] satisfies ReadonlyArray<readonly [string, RegistryDescriptor]>);

function resolveModifierFallback(context: ContextWithAssets | undefined) {
	const assets = context?.assets;
	const assetDescriptors =
		assets?.modifiers ??
		({} as Readonly<Record<string, TranslationModifierInfo>>);
	const keys = new Set<string>([
		...DEFAULT_MODIFIER_DESCRIPTOR_MAP.keys(),
		...Object.keys(assetDescriptors),
	]);
	const descriptors: Record<string, RegistryDescriptor> = {};
	for (const key of keys) {
		const assetDescriptor: TranslationModifierInfo | undefined =
			assetDescriptors[key];
		const fallback = DEFAULT_MODIFIER_DESCRIPTOR_MAP.get(key);
		const fallbackLabel = fallback?.label ?? humanizeIdentifier(key) ?? key;
		const fallbackIcon = fallback?.icon ?? '';
		descriptors[key] = {
			icon: coerceIcon(assetDescriptor?.icon, fallbackIcon),
			label: coerceLabel(assetDescriptor?.label, fallbackLabel),
		};
	}
	return descriptors;
}

function resolveModifierFallbackLabel(kind: string) {
	const fallback = DEFAULT_MODIFIER_DESCRIPTOR_MAP.get(kind);
	if (fallback) {
		return fallback.label;
	}
	return humanizeIdentifier(kind) ?? kind;
}

function resolveModifierFallbackIcon(kind: string) {
	const fallback = DEFAULT_MODIFIER_DESCRIPTOR_MAP.get(kind);
	return fallback ? fallback.icon : '';
}

export function selectModifierInfo(
	context: ContextWithAssets,
	kind: string,
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
	const fallbackDescriptor: RegistryDescriptor = {
		icon: resolveModifierFallbackIcon(kind),
		label: resolveModifierFallbackLabel(kind),
	};
	cache.set(cacheKey, { ...base, [kind]: fallbackDescriptor });
	return fallbackDescriptor;
}
