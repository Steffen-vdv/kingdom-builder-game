import type {
	ActionPlayerSnapshot,
	BuildingConfig,
	DevelopmentConfig,
	SessionPassiveSummary,
	SessionPlayerId,
	SessionPlayerStateSnapshot,
} from '@kingdom-builder/protocol';
import {
	appendResourceChanges,
	appendStatChanges,
	appendBuildingChanges,
	appendLandChanges,
	appendSlotChanges,
} from './diffSections';
import { appendPassiveChanges } from './passiveChanges';
import { createTranslationDiffContext } from './resourceSources/context';
import type { TranslationAssets } from '../context';

export interface PlayerSnapshot {
	resources: Record<string, number>;
	stats: Record<string, number>;
	population: Record<string, number>;
	buildings: string[];
	lands: Array<{
		id: string;
		slotsMax: number;
		slotsUsed: number;
		developments: string[];
	}>;
	passives: SessionPassiveSummary[];
}

type SnapshotInput =
	| SessionPlayerStateSnapshot
	| ActionPlayerSnapshot
	| PlayerSnapshot;

export function snapshotPlayer(playerState: SnapshotInput): PlayerSnapshot {
	const buildingList = [...playerState.buildings];
	const lands = playerState.lands.map((land) => ({
		id: land.id,
		slotsMax: land.slotsMax,
		slotsUsed: land.slotsUsed,
		developments: [...land.developments],
	}));
	const population =
		'population' in playerState ? { ...playerState.population } : {};
	return {
		resources: { ...playerState.resources },
		stats: { ...playerState.stats },
		population,
		buildings: buildingList,
		lands,
		passives: [...playerState.passives],
	};
}

export function collectResourceKeys(
	previousSnapshot: PlayerSnapshot,
	nextSnapshot: PlayerSnapshot,
): string[] {
	return Object.keys({
		...previousSnapshot.resources,
		...nextSnapshot.resources,
	});
}

interface DiffContext {
	activePlayer: {
		id: SessionPlayerId;
		population: Record<string, number>;
		lands: Array<{ developments: string[] }>;
	};
	buildings: {
		get(id: string): BuildingConfig;
		has?(id: string): boolean;
	};
	developments: {
		get(id: string): DevelopmentConfig;
		has?(id: string): boolean;
	};
	passives: unknown;
	assets: TranslationAssets;
}

export function diffSnapshots(
	previousSnapshot: PlayerSnapshot,
	nextSnapshot: PlayerSnapshot,
	context: DiffContext,
	resourceKeys: string[] = collectResourceKeys(previousSnapshot, nextSnapshot),
): string[] {
	const changeSummaries: string[] = [];
	appendResourceChanges(
		changeSummaries,
		previousSnapshot,
		nextSnapshot,
		resourceKeys,
		context.assets,
	);
	appendStatChanges(
		changeSummaries,
		previousSnapshot,
		nextSnapshot,
		nextSnapshot,
		undefined,
		context.assets,
	);
	const diffContext = createTranslationDiffContext(context);
	appendBuildingChanges(
		changeSummaries,
		previousSnapshot,
		nextSnapshot,
		diffContext,
	);
	appendLandChanges(
		changeSummaries,
		previousSnapshot,
		nextSnapshot,
		diffContext,
	);
	appendSlotChanges(
		changeSummaries,
		previousSnapshot,
		nextSnapshot,
		context.assets,
	);
	appendPassiveChanges(
		changeSummaries,
		previousSnapshot,
		nextSnapshot,
		context.assets,
	);
	return changeSummaries;
}
