import { cloneEffectList } from '../utils';
import { cloneMeta } from '../resource_sources/meta';
import type { EngineContext } from '../context';
import type { ActionTrace, PlayerSnapshot } from '../log';
import type { Land, PlayerId, PlayerState } from '../state';
import type { PassiveSummary } from '../services';
import type { LandSnapshot, PlayerStateSnapshot } from './types';
import type { SessionResourceBounds } from '@kingdom-builder/protocol';
import type { RuntimeResourceCatalog } from '../resource';
import {
	isBoundReference,
	resolveBoundValue,
	resolveResourceDefinition,
} from '../resource/state-helpers';

type ResourceSnapshotBucket = PlayerStateSnapshot['resourceSources'][string];

type SkipPhases = PlayerStateSnapshot['skipPhases'];

type SkipSteps = PlayerStateSnapshot['skipSteps'];

export function deepClone<T>(value: T): T {
	try {
		return structuredClone(value);
	} catch {
		return manualClone(value);
	}
}

function manualClone<T>(value: T, seen = new WeakMap<object, unknown>()): T {
	if (typeof value !== 'object' || value === null) {
		return value;
	}

	if (Array.isArray(value)) {
		const cached = seen.get(value);
		if (cached) {
			return cached as T;
		}
		const result: unknown[] = [];
		seen.set(value, result);
		for (const item of value) {
			result.push(manualClone(item, seen));
		}
		return result as unknown as T;
	}

	const prototype = Reflect.getPrototypeOf(value as object);
	if (prototype === Object.prototype || prototype === null) {
		const cached = seen.get(value as object);
		if (cached) {
			return cached as T;
		}
		const result: Record<PropertyKey, unknown> = {};
		seen.set(value as object, result);
		const source = value as Record<PropertyKey, unknown>;
		for (const key of Object.keys(source)) {
			result[key] = manualClone(source[key], seen);
		}
		for (const symbol of Object.getOwnPropertySymbols(source)) {
			result[symbol] = manualClone(source[symbol], seen);
		}
		return result as unknown as T;
	}

	return value;
}

function clonePassives(
	context: EngineContext,
	playerId: PlayerId,
): PassiveSummary[] {
	return context.passives.list(playerId).map((passive) => ({ ...passive }));
}

function cloneResourceSources(
	sources: PlayerState['resourceSources'],
): Record<string, ResourceSnapshotBucket> {
	const result: Record<string, ResourceSnapshotBucket> = {};
	for (const [resourceKey, contributions] of Object.entries(sources)) {
		const next: ResourceSnapshotBucket = {};
		if (contributions) {
			for (const [sourceKey, contribution] of Object.entries(contributions)) {
				next[sourceKey] = {
					amount: contribution?.amount ?? 0,
					meta: cloneMeta(contribution?.meta),
				};
			}
		}
		result[resourceKey] = next;
	}
	return result;
}

function cloneSkipPhases(skipPhases: PlayerState['skipPhases']): SkipPhases {
	return Object.fromEntries(
		Object.entries(skipPhases).map(([phaseId, flags]) => [
			phaseId,
			{ ...flags },
		]),
	);
}

function cloneSkipSteps(skipSteps: PlayerState['skipSteps']): SkipSteps {
	return Object.fromEntries(
		Object.entries(skipSteps).map(([phaseId, steps]) => [
			phaseId,
			Object.fromEntries(
				Object.entries(steps).map(([stepId, flags]) => [stepId, { ...flags }]),
			),
		]),
	);
}

function cloneLand(land: Land): LandSnapshot {
	const snapshot: LandSnapshot = {
		id: land.id,
		slotsMax: land.slotsMax,
		slotsUsed: land.slotsUsed,
		tilled: land.tilled,
		developments: [...land.developments],
	};
	if (land.upkeep) {
		snapshot.upkeep = { ...land.upkeep };
	}
	const upkeep = cloneEffectList(land.onPayUpkeepStep);
	if (upkeep) {
		snapshot.onPayUpkeepStep = upkeep;
	}
	const income = cloneEffectList(land.onGainIncomeStep);
	if (income) {
		snapshot.onGainIncomeStep = income;
	}
	const apGain = cloneEffectList(land.onGainAPStep);
	if (apGain) {
		snapshot.onGainAPStep = apGain;
	}
	return snapshot;
}

function cloneValuesV2(
	values: PlayerState['resourceValues'],
): Record<string, number> {
	const snapshot: Record<string, number> = {};
	for (const [resourceId, value] of Object.entries(values)) {
		snapshot[resourceId] = value ?? 0;
	}
	return snapshot;
}

/**
 * Resolves the effective bound for a resource, considering dynamic references.
 * If the bound was explicitly modified (touched), uses the stored value.
 * Otherwise, resolves from the definition (which may be a dynamic reference).
 */
function resolveEffectiveBound(
	player: PlayerState,
	catalog: RuntimeResourceCatalog,
	resourceId: string,
	direction: 'lower' | 'upper',
): number | null {
	const touched = player.resourceBoundTouched[resourceId]?.[direction];
	const storedBound =
		direction === 'lower'
			? player.resourceLowerBounds[resourceId]
			: player.resourceUpperBounds[resourceId];
	// If explicitly modified, use stored value (resolve in case it's a ref)
	if (touched) {
		return resolveBoundValue(storedBound, player.resourceValues);
	}
	const lookup = resolveResourceDefinition(catalog, resourceId);
	if (!lookup) {
		return resolveBoundValue(storedBound, player.resourceValues);
	}
	const defBound =
		direction === 'lower'
			? lookup.definition.lowerBound
			: lookup.definition.upperBound;
	// If definition has a dynamic reference, resolve it from current values
	if (isBoundReference(defBound)) {
		return resolveBoundValue(defBound, player.resourceValues);
	}
	// Static bound - use stored (resolve in case type includes references)
	return resolveBoundValue(storedBound, player.resourceValues);
}

function buildResourceBoundsSnapshot(
	player: PlayerState,
	catalog: RuntimeResourceCatalog,
): Record<string, SessionResourceBounds> {
	const snapshot: Record<string, SessionResourceBounds> = {};
	const keys = new Set(
		Object.keys(player.resourceValues).concat(
			Object.keys(player.resourceLowerBounds),
			Object.keys(player.resourceUpperBounds),
		),
	);
	for (const resourceId of keys) {
		const lower = resolveEffectiveBound(player, catalog, resourceId, 'lower');
		const upper = resolveEffectiveBound(player, catalog, resourceId, 'upper');
		snapshot[resourceId] = { lowerBound: lower, upperBound: upper };
	}
	return snapshot;
}

export function snapshotPlayer(
	context: EngineContext,
	player: PlayerState,
): PlayerStateSnapshot {
	const values = cloneValuesV2(player.resourceValues);
	const resourceBounds = buildResourceBoundsSnapshot(
		player,
		context.resourceCatalog,
	);
	return {
		id: player.id,
		name: player.name,
		aiControlled: Boolean(context.aiSystem?.has(player.id)),
		resourceTouched: { ...player.resourceTouched },
		values,
		resourceBounds,
		lands: player.lands.map((land) => cloneLand(land)),
		buildings: Array.from(player.buildings),
		actions: Array.from(player.actions),
		resourceSources: cloneResourceSources(player.resourceSources),
		skipPhases: cloneSkipPhases(player.skipPhases),
		skipSteps: cloneSkipSteps(player.skipSteps),
		passives: clonePassives(context, player.id),
	};
}

function clonePlayerSnapshot(snapshot: PlayerSnapshot): PlayerSnapshot {
	return {
		values: { ...snapshot.values },
		resourceBounds: Object.fromEntries(
			Object.entries(snapshot.resourceBounds).map(([resourceId, bounds]) => [
				resourceId,
				{
					lowerBound: bounds.lowerBound,
					upperBound: bounds.upperBound,
				},
			]),
		),
		buildings: [...snapshot.buildings],
		lands: snapshot.lands.map((land) => ({
			id: land.id,
			slotsMax: land.slotsMax,
			slotsUsed: land.slotsUsed,
			developments: [...land.developments],
		})),
		passives: snapshot.passives.map((passive) => ({ ...passive })),
	};
}

export function cloneActionTraces(traces: ActionTrace[]): ActionTrace[] {
	return traces.map((trace) => ({
		id: trace.id,
		before: clonePlayerSnapshot(trace.before),
		after: clonePlayerSnapshot(trace.after),
	}));
}
