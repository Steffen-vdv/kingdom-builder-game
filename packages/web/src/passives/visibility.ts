import type { PlayerSnapshot } from '../translation/log/snapshots';

type PopulationPrefix = string;

export type PassiveOrigin =
	| 'building'
	| 'building-bonus'
	| 'development'
	| 'population-assignment'
	| 'resource'
	| 'standalone';

export type PassiveSurface = 'player-panel' | 'log';

interface PassiveSourceDescriptor {
	type?: string | null;
}

interface PassiveMetaDescriptor {
	source?: PassiveSourceDescriptor | null;
}

export interface PassiveLike {
	id: string;
	meta?: PassiveMetaDescriptor | null;
}

type PassivePopulationState =
	| Record<string, unknown>
	| Map<string, unknown>
	| Set<string>
	| string[]
	| Iterable<string>;

interface PassiveOwnerState {
	buildings: Iterable<string>;
	lands: ReadonlyArray<{ id: string; developments: Iterable<string> }>;
	population?: PassivePopulationState;
}

export type PassiveOwner = PlayerSnapshot | PassiveOwnerState;

interface PassiveVisibilityContext {
	buildingIds: string[];
	buildingIdSet: Set<string>;
	buildingPrefixes: string[];
	developmentPassiveIds: Set<string>;
	populationPrefixes: string[];
}

type PassiveVisibilitySource = PassiveOwner | PassiveVisibilityContext;

export interface PassiveVisibilityOptions {
	populationIds?: Iterable<string>;
}

function isVisibilityContext(
	source: PassiveVisibilitySource,
): source is PassiveVisibilityContext {
	return (
		(source as PassiveVisibilityContext).buildingIdSet !== undefined &&
		(source as PassiveVisibilityContext).buildingPrefixes !== undefined &&
		(source as PassiveVisibilityContext).populationPrefixes !== undefined
	);
}

function toArray(iterable: Iterable<string>): string[] {
	return Array.from(iterable);
}

function toPopulationIds(
	owner: PassiveOwner,
	options?: PassiveVisibilityOptions,
): string[] {
	const explicit = options?.populationIds;
	if (explicit) {
		return Array.from(explicit);
	}
	const populationSource = (owner as { population?: PassivePopulationState })
		.population;
	if (!populationSource) {
		return [];
	}
	if (populationSource instanceof Map) {
		return Array.from(populationSource.keys(), String);
	}
	if (populationSource instanceof Set) {
		return Array.from(populationSource.values(), String);
	}
	if (Array.isArray(populationSource)) {
		return populationSource.map(String);
	}
	if (
		typeof (populationSource as Iterable<unknown>)[Symbol.iterator] ===
		'function'
	) {
		return Array.from(populationSource as Iterable<unknown>, (value) =>
			String(value),
		);
	}
	if (typeof populationSource === 'object') {
		return Object.keys(populationSource as Record<string, unknown>);
	}
	return [];
}

function createPopulationPrefixes(
	owner: PassiveOwner,
	options?: PassiveVisibilityOptions,
): PopulationPrefix[] {
	const populationIds = toPopulationIds(owner, options);
	return populationIds.map((id) => `${id}_`);
}

function createContextFromOwner(
	owner: PassiveOwner,
	options?: PassiveVisibilityOptions,
): PassiveVisibilityContext {
	const buildingIds = toArray(owner.buildings);
	const buildingIdSet = new Set(buildingIds);
	const buildingPrefixes = buildingIds.map((id) => `${id}_`);
	const developmentPassiveIds = new Set<string>();
	for (const land of owner.lands) {
		const landId = land.id;
		for (const development of land.developments) {
			developmentPassiveIds.add(`${development}_${landId}`);
		}
	}
	const populationPrefixes = createPopulationPrefixes(owner, options);
	return {
		buildingIds,
		buildingIdSet,
		buildingPrefixes,
		developmentPassiveIds,
		populationPrefixes,
	};
}

function resolveContext(
	source: PassiveVisibilitySource,
	options?: PassiveVisibilityOptions,
): PassiveVisibilityContext {
	if (isVisibilityContext(source)) {
		return source;
	}
	return createContextFromOwner(source, options);
}

function hasPopulationPrefix(
	passiveId: string,
	context: PassiveVisibilityContext,
): boolean {
	for (const prefix of context.populationPrefixes) {
		if (passiveId.startsWith(prefix)) {
			return true;
		}
	}
	return false;
}

function deriveOriginFromContext(
	passive: PassiveLike,
	context: PassiveVisibilityContext,
): PassiveOrigin {
	const metaType = passive.meta?.source?.type;
	if (metaType) {
		const normalized = metaType.toLowerCase();
		if (normalized === 'building') {
			if (
				context.buildingPrefixes.some((prefix) => passive.id.startsWith(prefix))
			) {
				return 'building-bonus';
			}
			return 'building';
		}
		if (normalized === 'development') {
			return 'development';
		}
		if (normalized.startsWith('population')) {
			return 'population-assignment';
		}
		if (normalized === 'resource') {
			return 'resource';
		}
	}
	if (context.buildingIdSet.has(passive.id)) {
		return 'building';
	}
	if (
		context.buildingPrefixes.some((prefix) => passive.id.startsWith(prefix))
	) {
		return 'building-bonus';
	}
	if (context.developmentPassiveIds.has(passive.id)) {
		return 'development';
	}
	if (hasPopulationPrefix(passive.id, context)) {
		return 'population-assignment';
	}
	return 'standalone';
}

export function derivePassiveOrigin(
	passive: PassiveLike,
	source: PassiveVisibilitySource,
	options?: PassiveVisibilityOptions,
): PassiveOrigin {
	const context = resolveContext(source, options);
	return deriveOriginFromContext(passive, context);
}

const HIDDEN_ORIGINS: Record<PassiveSurface, ReadonlySet<PassiveOrigin>> = {
	'player-panel': new Set([
		'building',
		'building-bonus',
		'development',
		'population-assignment',
		'resource',
	]),
	log: new Set([
		'building',
		'building-bonus',
		'development',
		'population-assignment',
		'resource',
	]),
};

function shouldSurfacePassiveWithContext(
	passive: PassiveLike,
	context: PassiveVisibilityContext,
	surface: PassiveSurface,
): boolean {
	const origin = deriveOriginFromContext(passive, context);
	const hidden = HIDDEN_ORIGINS[surface];
	if (!hidden) {
		return true;
	}
	return !hidden.has(origin);
}

export function shouldSurfacePassive(
	passive: PassiveLike,
	source: PassiveVisibilitySource,
	surface: PassiveSurface,
	options?: PassiveVisibilityOptions,
): boolean {
	const context = resolveContext(source, options);
	return shouldSurfacePassiveWithContext(passive, context, surface);
}

export function filterPassivesForSurface<T extends PassiveLike>(
	passives: readonly T[],
	source: PassiveVisibilitySource,
	surface: PassiveSurface,
	options?: PassiveVisibilityOptions,
): T[] {
	const context = resolveContext(source, options);
	return passives.filter((passive) =>
		shouldSurfacePassiveWithContext(passive, context, surface),
	);
}

export function createPassiveVisibilityContext(
	source: PassiveOwner,
	options?: PassiveVisibilityOptions,
): PassiveVisibilityContext {
	return createContextFromOwner(source, options);
}
