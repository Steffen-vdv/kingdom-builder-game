import { cloneEffectList } from '../utils';
import { cloneMeta } from '../stat_sources/meta';
import type { EngineContext } from '../context';
import type { ActionTrace, PlayerSnapshot } from '../log';
import type { Land, PlayerId, PlayerState } from '../state';
import { PopulationRole, Resource, Stat } from '../state';
import { getResourceValue } from '../resource-v2';
import type { PassiveSummary } from '../services';
import type { LandSnapshot, PlayerStateSnapshot } from './types';
import type { SessionResourceBoundsV2 } from '@kingdom-builder/protocol';

type StatSnapshotBucket = PlayerStateSnapshot['statSources'][string];

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

function cloneStatSources(
	sources: PlayerState['statSources'],
): Record<string, StatSnapshotBucket> {
	const result: Record<string, StatSnapshotBucket> = {};
	for (const [statKey, contributions] of Object.entries(sources)) {
		const next: StatSnapshotBucket = {};
		if (contributions) {
			for (const [sourceKey, contribution] of Object.entries(contributions)) {
				next[sourceKey] = {
					amount: contribution?.amount ?? 0,
					meta: cloneMeta(contribution?.meta),
				};
			}
		}
		result[statKey] = next;
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

function buildResourceBoundsSnapshot(
	player: PlayerState,
): Record<string, SessionResourceBoundsV2> {
	const snapshot: Record<string, SessionResourceBoundsV2> = {};
	const keys = new Set(
		Object.keys(player.resourceValues).concat(
			Object.keys(player.resourceLowerBounds),
			Object.keys(player.resourceUpperBounds),
		),
	);
	for (const resourceId of keys) {
		const lower = player.resourceLowerBounds[resourceId] ?? null;
		const upper = player.resourceUpperBounds[resourceId] ?? null;
		snapshot[resourceId] = { lowerBound: lower, upperBound: upper };
	}
	return snapshot;
}

function deriveLegacyResourceRecord(
	player: PlayerState,
): Record<string, number> {
	const snapshot: Record<string, number> = {};
	for (const resourceKey of Object.values(Resource)) {
		const resourceId = player.getResourceV2Id(resourceKey);
		snapshot[resourceKey] = getResourceValue(player, resourceId);
	}
	return snapshot;
}

function deriveLegacyStatRecord(player: PlayerState): Record<string, number> {
	const snapshot: Record<string, number> = {};
	for (const statKey of Object.values(Stat)) {
		const resourceId = player.getStatResourceV2Id(statKey);
		snapshot[statKey] = getResourceValue(player, resourceId);
	}
	return snapshot;
}

function deriveLegacyPopulationRecord(
	player: PlayerState,
): Record<string, number> {
	const snapshot: Record<string, number> = {};
	for (const role of Object.values(PopulationRole)) {
		const resourceId = player.getPopulationResourceV2Id(role);
		snapshot[role] = getResourceValue(player, resourceId);
	}
	return snapshot;
}

export function snapshotPlayer(
	context: EngineContext,
	player: PlayerState,
): PlayerStateSnapshot {
	const valuesV2 = cloneValuesV2(player.resourceValues);
	const resourceBoundsV2 = buildResourceBoundsSnapshot(player);
	return {
		id: player.id,
		name: player.name,
		aiControlled: Boolean(context.aiSystem?.has(player.id)),
		resources: deriveLegacyResourceRecord(player),
		stats: deriveLegacyStatRecord(player),
		statsHistory: { ...player.statsHistory },
		population: deriveLegacyPopulationRecord(player),
		valuesV2,
		resourceBoundsV2,
		lands: player.lands.map((land) => cloneLand(land)),
		buildings: Array.from(player.buildings),
		actions: Array.from(player.actions),
		statSources: cloneStatSources(player.statSources),
		skipPhases: cloneSkipPhases(player.skipPhases),
		skipSteps: cloneSkipSteps(player.skipSteps),
		passives: clonePassives(context, player.id),
	};
}

function clonePlayerSnapshot(snapshot: PlayerSnapshot): PlayerSnapshot {
	return {
		resources: { ...snapshot.resources },
		stats: { ...snapshot.stats },
		valuesV2: { ...snapshot.valuesV2 },
		resourceBoundsV2: Object.fromEntries(
			Object.entries(snapshot.resourceBoundsV2).map(([resourceId, bounds]) => [
				resourceId,
				{ lowerBound: bounds.lowerBound, upperBound: bounds.upperBound },
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
