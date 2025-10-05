import {
	type EngineContext,
	type PassiveSummary,
	type PlayerId,
	type PlayerStateSnapshot,
	type PlayerSnapshot as EnginePlayerSnapshot,
} from '@kingdom-builder/engine';
import { type ResourceKey } from '@kingdom-builder/contents';
import { type Land } from '../content';
import {
	appendResourceChanges,
	appendStatChanges,
	appendBuildingChanges,
	appendLandChanges,
	appendSlotChanges,
} from './diffSections';
import { appendPassiveChanges } from './passiveChanges';

export interface PlayerSnapshot {
	resources: Record<string, number>;
	stats: Record<string, number>;
	buildings: string[];
	lands: Array<{
		id: string;
		slotsMax: number;
		slotsUsed: number;
		developments: string[];
	}>;
	passives: PassiveSummary[];
}

interface LegacyPlayerSnapshot {
	id: string;
	resources: Record<string, number>;
	stats: Record<string, number>;
	buildings: Set<string> | string[];
	lands: Land[];
	passives?: PassiveSummary[];
}

type SnapshotInput =
	| PlayerStateSnapshot
	| LegacyPlayerSnapshot
	| EnginePlayerSnapshot;

export function snapshotPlayer(
	playerState: SnapshotInput,
	context?: EngineContext,
): PlayerSnapshot {
	const buildingList = Array.isArray(playerState.buildings)
		? [...playerState.buildings]
		: Array.from(playerState.buildings ?? []);
	const lands = playerState.lands.map((land) => ({
		id: land.id,
		slotsMax: land.slotsMax,
		slotsUsed: land.slotsUsed,
		developments: [...land.developments],
	}));
	const hasPassives = 'passives' in playerState && playerState.passives;
	const passives = hasPassives
		? [...playerState.passives!]
		: context && 'id' in playerState
			? context.passives.list(playerState.id as PlayerId)
			: [];
	return {
		resources: { ...playerState.resources },
		stats: { ...playerState.stats },
		buildings: buildingList,
		lands,
		passives,
	};
}

export function collectResourceKeys(
	previousSnapshot: PlayerSnapshot,
	nextSnapshot: PlayerSnapshot,
): ResourceKey[] {
	return Object.keys({
		...previousSnapshot.resources,
		...nextSnapshot.resources,
	}) as ResourceKey[];
}

export function diffSnapshots(
	previousSnapshot: PlayerSnapshot,
	nextSnapshot: PlayerSnapshot,
	context: EngineContext,
	resourceKeys: ResourceKey[] = collectResourceKeys(
		previousSnapshot,
		nextSnapshot,
	),
): string[] {
	const changeSummaries: string[] = [];
	appendResourceChanges(
		changeSummaries,
		previousSnapshot,
		nextSnapshot,
		resourceKeys,
	);
	appendStatChanges(
		changeSummaries,
		previousSnapshot,
		nextSnapshot,
		context,
		undefined,
	);
	appendBuildingChanges(
		changeSummaries,
		previousSnapshot,
		nextSnapshot,
		context,
	);
	appendLandChanges(changeSummaries, previousSnapshot, nextSnapshot, context);
	appendSlotChanges(changeSummaries, previousSnapshot, nextSnapshot);
	appendPassiveChanges(changeSummaries, previousSnapshot, nextSnapshot);
	return changeSummaries;
}
