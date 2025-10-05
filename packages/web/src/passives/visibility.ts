import { POPULATIONS } from '@kingdom-builder/contents';
import type { PassiveSummary } from '@kingdom-builder/engine';
import type { PlayerSnapshot } from '../translation/log/snapshots';

type PopulationPrefix = string;

const POPULATION_PASSIVE_PREFIXES: PopulationPrefix[] = Array.from(
	POPULATIONS.keys(),
	(id) => `${id}_`,
);

export type PassiveOrigin =
	| 'building'
	| 'building-bonus'
	| 'development'
	| 'population-assignment'
	| 'standalone';

export type PassiveSurface = 'player-panel' | 'log';

export type PassiveLike = Pick<PassiveSummary, 'id' | 'meta'>;

interface PassiveOwnerState {
	buildings: Iterable<string>;
	lands: ReadonlyArray<{ id: string; developments: Iterable<string> }>;
}

export type PassiveOwner = PlayerSnapshot | PassiveOwnerState;

interface PassiveVisibilityContext {
	buildingIds: string[];
	buildingIdSet: Set<string>;
	buildingPrefixes: string[];
	developmentPassiveIds: Set<string>;
}

type PassiveVisibilitySource = PassiveOwner | PassiveVisibilityContext;

function isVisibilityContext(
	source: PassiveVisibilitySource,
): source is PassiveVisibilityContext {
	return (
		(source as PassiveVisibilityContext).buildingIdSet !== undefined &&
		(source as PassiveVisibilityContext).buildingPrefixes !== undefined
	);
}

function toArray(iterable: Iterable<string>): string[] {
	return Array.from(iterable);
}

function createContextFromOwner(owner: PassiveOwner): PassiveVisibilityContext {
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
	return {
		buildingIds,
		buildingIdSet,
		buildingPrefixes,
		developmentPassiveIds,
	};
}

function resolveContext(
	source: PassiveVisibilitySource,
): PassiveVisibilityContext {
	if (isVisibilityContext(source)) {
		return source;
	}
	return createContextFromOwner(source);
}

function hasPopulationPrefix(id: string): boolean {
	for (const prefix of POPULATION_PASSIVE_PREFIXES) {
		if (id.startsWith(prefix)) {
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
	if (hasPopulationPrefix(passive.id)) {
		return 'population-assignment';
	}
	return 'standalone';
}

export function derivePassiveOrigin(
	passive: PassiveLike,
	source: PassiveVisibilitySource,
): PassiveOrigin {
	const context = resolveContext(source);
	return deriveOriginFromContext(passive, context);
}

const HIDDEN_ORIGINS: Record<PassiveSurface, ReadonlySet<PassiveOrigin>> = {
	'player-panel': new Set([
		'building',
		'building-bonus',
		'development',
		'population-assignment',
	]),
	log: new Set([
		'building',
		'building-bonus',
		'development',
		'population-assignment',
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
): boolean {
	const context = resolveContext(source);
	return shouldSurfacePassiveWithContext(passive, context, surface);
}

export function filterPassivesForSurface<T extends PassiveLike>(
	passives: readonly T[],
	source: PassiveVisibilitySource,
	surface: PassiveSurface,
): T[] {
	const context = resolveContext(source);
	return passives.filter((passive) =>
		shouldSurfacePassiveWithContext(passive, context, surface),
	);
}

export function createPassiveVisibilityContext(
	source: PassiveOwner,
): PassiveVisibilityContext {
	return createContextFromOwner(source);
}
