import { cloneEffectList } from '../utils';
import { cloneMeta } from '../stat_sources/meta';
import type { EngineContext } from '../context';
import type { ActionTrace, PlayerSnapshot } from '../log';
import type { Land, PlayerId, PlayerState } from '../state';
import type { PassiveSummary } from '../services';
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
	const aiControlled = Boolean(context.aiSystem?.has(player.id));
	return {
		id: player.id,
		name: player.name,
		aiControlled,
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
