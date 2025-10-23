import { cloneEffectList } from '../utils';
import { cloneMeta } from '../stat_sources/meta';
import type { EngineContext } from '../context';
import type { ActionTrace, PlayerSnapshot } from '../log';
import type { Land, PlayerId, PlayerState } from '../state';
import type { PassiveSummary } from '../services';
import type {
	SessionResourceTierStateSnapshot,
	SessionResourceValueParentSnapshot,
	SessionResourceValueSnapshot,
	SessionResourceValueSnapshotMap,
} from '@kingdom-builder/protocol';
import type { LandSnapshot, PlayerStateSnapshot } from './types';

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

function cloneResourceTierState(
	tierState: PlayerState['resourceV2']['tiers'][string] | undefined,
): SessionResourceTierStateSnapshot | undefined {
	if (!tierState) {
		return undefined;
	}
	const snapshot: SessionResourceTierStateSnapshot = {};
	if (tierState.trackId !== undefined) {
		snapshot.trackId = tierState.trackId;
	}
	if (tierState.tierId !== undefined) {
		snapshot.tierId = tierState.tierId;
	}
	if (tierState.nextTierId !== undefined) {
		snapshot.nextTierId = tierState.nextTierId;
	}
	if (tierState.previousTierId !== undefined) {
		snapshot.previousTierId = tierState.previousTierId;
	}
	return snapshot;
}

function cloneResourceParent(
	state: PlayerState['resourceV2'],
	parentId: string,
): SessionResourceValueParentSnapshot | undefined {
	const amount = state.amounts[parentId];
	if (amount === undefined) {
		return undefined;
	}
	const snapshot: SessionResourceValueParentSnapshot = {
		id: parentId,
		amount: amount ?? 0,
		touched: Boolean(state.touched[parentId]),
	};
	const bounds = state.bounds[parentId];
	if (bounds) {
		snapshot.bounds = { ...bounds };
	}
	return snapshot;
}

function createRecentResourceGains(
	state: PlayerState['resourceV2'],
	resourceId: string,
): ReadonlyArray<{ resourceId: string; delta: number }> {
	const delta = state.recentDeltas[resourceId] ?? 0;
	if (delta === 0) {
		return [];
	}
	return [{ resourceId, delta }];
}

function cloneResourceValue(
	state: PlayerState['resourceV2'],
	resourceId: string,
): SessionResourceValueSnapshot {
	const snapshot: SessionResourceValueSnapshot = {
		amount: state.amounts[resourceId] ?? 0,
		touched: Boolean(state.touched[resourceId]),
		recentGains: createRecentResourceGains(state, resourceId),
	};
	const tier = cloneResourceTierState(state.tiers[resourceId]);
	if (tier) {
		snapshot.tier = tier;
	}
	const parentId = state.childToParent[resourceId];
	if (parentId) {
		const parentSnapshot = cloneResourceParent(state, parentId);
		if (parentSnapshot) {
			snapshot.parent = parentSnapshot;
		}
	}
	return snapshot;
}

function snapshotResourceValues(
	player: PlayerState,
): SessionResourceValueSnapshotMap | undefined {
	const state = player.resourceV2;
	const { resourceIds, parentIds } = state;
	if (resourceIds.length === 0 && parentIds.length === 0) {
		return undefined;
	}
	const values: SessionResourceValueSnapshotMap = {};
	for (const resourceId of resourceIds) {
		values[resourceId] = cloneResourceValue(state, resourceId);
	}
	for (const parentId of parentIds) {
		if (Object.prototype.hasOwnProperty.call(values, parentId)) {
			continue;
		}
		const tier = cloneResourceTierState(state.tiers[parentId]);
		const snapshot: SessionResourceValueSnapshot = {
			amount: state.amounts[parentId] ?? 0,
			touched: Boolean(state.touched[parentId]),
			recentGains: [],
		};
		if (tier) {
			snapshot.tier = tier;
		}
		values[parentId] = snapshot;
	}
	return values;
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

export function snapshotPlayer(
	context: EngineContext,
	player: PlayerState,
): PlayerStateSnapshot {
	const values = snapshotResourceValues(player);
	return {
		id: player.id,
		name: player.name,
		aiControlled: Boolean(context.aiSystem?.has(player.id)),
		...(values ? { values } : {}),
		resources: { ...player.resources },
		stats: { ...player.stats },
		statsHistory: { ...player.statsHistory },
		population: { ...player.population },
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
