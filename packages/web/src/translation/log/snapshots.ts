import type {
	ActionPlayerSnapshot,
	BuildingConfig,
	DevelopmentConfig,
	SessionPassiveSummary,
	SessionPlayerId,
	SessionPlayerStateSnapshot,
	SessionResourceBoundsV2,
} from '@kingdom-builder/protocol';
import {
	appendResourceChanges,
	appendPercentBreakdownChanges,
	appendBuildingChanges,
	appendLandChanges,
	appendSlotChanges,
} from './diffSections';
import { appendPassiveChanges } from './passiveChanges';
import { createTranslationDiffContext } from './resourceSources/context';
import type {
	TranslationActionCategoryRegistry,
	TranslationAssets,
	TranslationResourceV2MetadataSelectors,
} from '../context';

export interface PlayerSnapshot {
	buildings: string[];
	lands: Array<{
		id: string;
		slotsMax: number;
		slotsUsed: number;
		developments: string[];
	}>;
	passives: SessionPassiveSummary[];
	valuesV2: Record<string, number>;
	resourceBoundsV2: Record<string, SessionResourceBoundsV2>;
}

type SnapshotInput =
	| SessionPlayerStateSnapshot
	| ActionPlayerSnapshot
	| PlayerSnapshot;

interface SnapshotContext {
	game: {
		players: Array<{
			id: SessionPlayerId;
			population: Record<string, number>;
			passives?: SessionPassiveSummary[];
		}>;
	};
	passives: {
		list(owner?: SessionPlayerId): SessionPassiveSummary[];
	};
}

export function snapshotPlayer(playerState: SnapshotInput): PlayerSnapshot {
	const buildingList = [...playerState.buildings];
	const lands = playerState.lands.map((land) => ({
		id: land.id,
		slotsMax: land.slotsMax,
		slotsUsed: land.slotsUsed,
		developments: [...land.developments],
	}));
	const passives = 'passives' in playerState ? [...playerState.passives] : [];
	const valuesV2 =
		'valuesV2' in playerState && playerState.valuesV2
			? { ...playerState.valuesV2 }
			: {};
	const resourceBoundsV2 =
		'resourceBoundsV2' in playerState && playerState.resourceBoundsV2
			? Object.fromEntries(
					Object.entries(playerState.resourceBoundsV2).map(([id, entry]) => [
						id,
						{
							lowerBound: entry.lowerBound ?? null,
							upperBound: entry.upperBound ?? null,
						} satisfies SessionResourceBoundsV2,
					]),
				)
			: {};
	return {
		buildings: buildingList,
		lands,
		passives,
		valuesV2,
		resourceBoundsV2,
	};
}

export function collectResourceKeys(
	previousSnapshot: PlayerSnapshot,
	nextSnapshot: PlayerSnapshot,
): string[] {
	const keys = new Set<string>();
	// Collect keys from valuesV2 (unified resources, stats, population)
	for (const key of Object.keys(previousSnapshot.valuesV2)) {
		keys.add(key);
	}
	for (const key of Object.keys(nextSnapshot.valuesV2)) {
		keys.add(key);
	}
	return Array.from(keys);
}

interface DiffContext extends SnapshotContext {
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
	actionCategories: TranslationActionCategoryRegistry;
	assets: TranslationAssets;
	resourceMetadataV2: TranslationResourceV2MetadataSelectors;
}

export function diffSnapshots(
	previousSnapshot: PlayerSnapshot,
	nextSnapshot: PlayerSnapshot,
	context: DiffContext,
	resourceKeys: string[] = collectResourceKeys(previousSnapshot, nextSnapshot),
): string[] {
	const changeSummaries: string[] = [];
	const resourceChanges = appendResourceChanges(
		previousSnapshot,
		nextSnapshot,
		resourceKeys,
		context.assets,
		context.resourceMetadataV2,
	);
	for (const change of resourceChanges) {
		changeSummaries.push(change.summary);
	}
	appendPercentBreakdownChanges(
		changeSummaries,
		previousSnapshot,
		nextSnapshot,
		nextSnapshot,
		undefined,
		context.assets,
		context.resourceMetadataV2,
	);
	const diffContext = createTranslationDiffContext({
		...context,
		actionCategories: context.actionCategories,
	});
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
	const passiveChanges = appendPassiveChanges(
		previousSnapshot,
		nextSnapshot,
		context.assets,
	);
	for (const change of passiveChanges) {
		changeSummaries.push(change.summary);
	}
	return changeSummaries;
}
