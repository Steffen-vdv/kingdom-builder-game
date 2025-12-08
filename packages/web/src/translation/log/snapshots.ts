import type {
	ActionPlayerSnapshot,
	BuildingConfig,
	DevelopmentConfig,
	SessionPassiveSummary,
	SessionPlayerId,
	SessionPlayerStateSnapshot,
	SessionResourceBounds,
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
	TranslationResourceMetadataSelectors,
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
	values: Record<string, number>;
	resourceBounds: Record<string, SessionResourceBounds>;
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
	const values =
		'values' in playerState && playerState.values
			? { ...playerState.values }
			: {};
	const resourceBounds =
		'resourceBounds' in playerState && playerState.resourceBounds
			? Object.fromEntries(
					Object.entries(playerState.resourceBounds).map(([id, entry]) => [
						id,
						{
							lowerBound: entry.lowerBound ?? null,
							upperBound: entry.upperBound ?? null,
						} satisfies SessionResourceBounds,
					]),
				)
			: {};
	return {
		buildings: buildingList,
		lands,
		passives,
		values,
		resourceBounds,
	};
}

export function collectResourceKeys(
	previousSnapshot: PlayerSnapshot,
	nextSnapshot: PlayerSnapshot,
): string[] {
	const keys = new Set<string>();
	// Collect keys from values (unified resources, stats, population)
	for (const key of Object.keys(previousSnapshot.values)) {
		keys.add(key);
	}
	for (const key of Object.keys(nextSnapshot.values)) {
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
	resourceMetadata: TranslationResourceMetadataSelectors;
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
		context.resourceMetadata,
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
		context.resourceMetadata,
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
