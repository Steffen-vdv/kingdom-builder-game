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
	appendResourceV2Changes,
	appendBuildingChanges,
	appendLandChanges,
	appendSlotChanges,
	normalizeResourceIds,
} from './diffSections';
import { appendPassiveChanges } from './passiveChanges';
import {
	createTranslationDiffContext,
	type TranslationDiffContext,
} from './resourceSources/context';
import type {
	TranslationActionCategoryRegistry,
	TranslationAssets,
} from '../context';

export interface PlayerSnapshot {
	resources: Record<string, number>;
	stats: Record<string, number>;
	population: Record<string, number>;
	resourcesV2?: Record<string, number>;
	resourceBoundsV2?: Record<string, SessionResourceBoundsV2>;
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

function cloneResourceBoundsRecord(
	bounds: Record<string, SessionResourceBoundsV2>,
): Record<string, SessionResourceBoundsV2> {
	const cloned: Record<string, SessionResourceBoundsV2> = {};
	for (const [id, entry] of Object.entries(bounds)) {
		cloned[id] = {
			lowerBound: entry.lowerBound === undefined ? null : entry.lowerBound,
			upperBound: entry.upperBound === undefined ? null : entry.upperBound,
		};
	}
	return cloned;
}

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
	const population = (() => {
		if ('population' in playerState) {
			return { ...playerState.population };
		}
		return {};
	})();
	const passives = 'passives' in playerState ? [...playerState.passives] : [];
	const snapshot: PlayerSnapshot = {
		resources: { ...playerState.resources },
		stats: { ...playerState.stats },
		population,
		buildings: buildingList,
		lands,
		passives,
	};
	if ('valuesV2' in playerState && playerState.valuesV2) {
		snapshot.resourcesV2 = { ...playerState.valuesV2 };
	}
	if ('resourceBoundsV2' in playerState && playerState.resourceBoundsV2) {
		snapshot.resourceBoundsV2 = cloneResourceBoundsRecord(
			playerState.resourceBoundsV2,
		);
	}
	return snapshot;
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
	resourcesV2?: TranslationDiffContext['resourcesV2'];
	resourceMetadataV2: TranslationDiffContext['resourceMetadataV2'];
	resourceGroupMetadataV2: TranslationDiffContext['resourceGroupMetadataV2'];
	signedResourceGains: TranslationDiffContext['signedResourceGains'];
}

export function diffSnapshots(
	previousSnapshot: PlayerSnapshot,
	nextSnapshot: PlayerSnapshot,
	context: DiffContext,
	legacyResourceKeys?: readonly string[],
): string[] {
	const changeSummaries: string[] = [];
	const diffContext = createTranslationDiffContext({
		activePlayer: context.activePlayer,
		buildings: context.buildings,
		developments: context.developments,
		actionCategories: context.actionCategories,
		passives: context.passives,
		assets: context.assets,
		resourcesV2: context.resourcesV2,
		resourceMetadataV2: context.resourceMetadataV2,
		resourceGroupMetadataV2: context.resourceGroupMetadataV2,
		signedResourceGains: context.signedResourceGains,
	});
	const resourceIds: string[] = normalizeResourceIds(
		legacyResourceKeys,
		diffContext,
		previousSnapshot,
		nextSnapshot,
	);
	const resourceChanges = appendResourceV2Changes(
		previousSnapshot,
		nextSnapshot,
		resourceIds,
		diffContext,
	);
	for (const change of resourceChanges) {
		changeSummaries.push(change.summary);
	}
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
