import { cloneEffectList } from '../utils';
import { cloneMeta } from '../stat_sources/meta';
import type { EngineContext } from '../context';
import type { ActionTrace, PlayerSnapshot } from '../log';
import type { Land, PlayerId, PlayerState } from '../state';
import type { PassiveSummary } from '../services';
import { clonePassiveRecord } from '../services/passive_helpers';
import type {
	LandSnapshot,
	PassiveRecordSnapshot,
	PlayerStateSnapshot,
} from './types';

type StatSnapshotBucket = PlayerStateSnapshot['statSources'][string];

type SkipPhases = PlayerStateSnapshot['skipPhases'];

type SkipSteps = PlayerStateSnapshot['skipSteps'];

export function deepClone<T>(value: T): T {
	try {
		return structuredClone(value);
	} catch {
		return value;
	}
}

function clonePassives(
	context: EngineContext,
	playerId: PlayerId,
): PassiveSummary[] {
	return context.passives.list(playerId).map((passive) => ({ ...passive }));
}

function clonePassiveRecords(
	context: EngineContext,
	playerId: PlayerId,
): PassiveRecordSnapshot[] {
	return context.passives.values(playerId).map((record) => {
		const { frames: _frames, ...snapshot } = clonePassiveRecord(record);
		return snapshot;
	});
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
	return {
		id: player.id,
		name: player.name,
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
		passiveRecords: clonePassiveRecords(context, player.id),
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
