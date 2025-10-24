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
	appendStatChanges,
	appendBuildingChanges,
	appendLandChanges,
	appendSlotChanges,
} from './diffSections';
import { appendPassiveChanges } from './passiveChanges';
import { createTranslationDiffContext } from './resourceSources/context';
import { getResourceIdForLegacy } from '../resourceV2';
import type {
	TranslationActionCategoryRegistry,
	TranslationAssets,
	TranslationContext,
} from '../context';

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
	valuesV2?: Record<string, number>;
	resourceBoundsV2?: Record<string, SessionResourceBoundsV2>;
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
	const population = (() => {
		if ('population' in playerState) {
			return { ...playerState.population };
		}
		return {};
	})();
	const passives = 'passives' in playerState ? [...playerState.passives] : [];
	const valuesV2 =
		'valuesV2' in playerState && playerState.valuesV2
			? { ...playerState.valuesV2 }
			: undefined;
	const resourceBoundsV2 =
		'resourceBoundsV2' in playerState && playerState.resourceBoundsV2
			? structuredClone(playerState.resourceBoundsV2)
			: undefined;
	return {
		resources: { ...playerState.resources },
		stats: { ...playerState.stats },
		population,
		buildings: buildingList,
		lands,
		passives,
		...(valuesV2 ? { valuesV2 } : {}),
		...(resourceBoundsV2 ? { resourceBoundsV2 } : {}),
	};
}

export function collectResourceKeys(
	previousSnapshot: PlayerSnapshot,
	nextSnapshot: PlayerSnapshot,
): string[] {
	const ids = new Set<string>();
	for (const snapshot of [previousSnapshot, nextSnapshot]) {
		const values = snapshot.valuesV2;
		if (!values) {
			continue;
		}
		for (const id of Object.keys(values)) {
			ids.add(id);
		}
	}
	if (ids.size > 0) {
		return Array.from(ids);
	}
	const buckets: Array<['resources' | 'stats', Record<string, number>]> = [
		['resources', previousSnapshot.resources],
		['resources', nextSnapshot.resources],
		['stats', previousSnapshot.stats],
		['stats', nextSnapshot.stats],
	];
	for (const [bucket, record] of buckets) {
		for (const key of Object.keys(record)) {
			const id = getResourceIdForLegacy(bucket, key);
			if (id) {
				ids.add(id);
			}
		}
	}
	return Array.from(ids);
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
	resourcesV2: TranslationContext['resourcesV2'];
	resourceMetadataV2: TranslationContext['resourceMetadataV2'];
	resourceGroupMetadataV2: TranslationContext['resourceGroupMetadataV2'];
	signedResourceGains: TranslationContext['signedResourceGains'];
}

export function diffSnapshots(
	previousSnapshot: PlayerSnapshot,
	nextSnapshot: PlayerSnapshot,
	context: DiffContext,
	resourceKeys: string[] = collectResourceKeys(previousSnapshot, nextSnapshot),
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
	const resourceChanges = appendResourceChanges(
		previousSnapshot,
		nextSnapshot,
		resourceKeys,
		diffContext,
	);
	for (const change of resourceChanges) {
		changeSummaries.push(change.summary);
	}
	appendStatChanges(
		changeSummaries,
		previousSnapshot,
		nextSnapshot,
		nextSnapshot,
		undefined,
		context.assets,
		diffContext.resourceMetadataV2,
		diffContext.signedResourceGains,
	);
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
