import type {
	ActionPlayerSnapshot,
	BuildingConfig,
	DevelopmentConfig,
	PopulationConfig,
	SessionPassiveSummary,
	SessionPlayerId,
	SessionPlayerStateSnapshot,
} from '@kingdom-builder/protocol';
import { type Land } from '../content';
import {
	appendResourceChanges,
	appendStatChanges,
	appendBuildingChanges,
	appendLandChanges,
	appendSlotChanges,
} from './diffSections';
import { appendPassiveChanges } from './passiveChanges';
import {
	createTranslationDiffContext,
	type TranslationDiffContext,
} from './resourceSources/context';
import type {
	TranslationInfo,
	TranslationResourceRegistry,
	TranslationStatRegistry,
} from '../context/types';

type ResourceKey = string;

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

interface LegacyPlayerSnapshot {
	id: string;
	resources: Record<string, number>;
	stats: Record<string, number>;
	population?: Record<string, number>;
	buildings: Set<string> | string[];
	lands: Land[];
	passives?: SessionPassiveSummary[];
}

type SnapshotInput =
	| SessionPlayerStateSnapshot
	| LegacyPlayerSnapshot
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

export function snapshotPlayer(
	playerState: SnapshotInput,
	context?: SnapshotContext,
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
	const population = (() => {
		if ('population' in playerState && playerState.population) {
			return { ...playerState.population };
		}
		if (context && 'id' in playerState) {
			const match = context.game.players.find((entry) => {
				return entry.id === (playerState.id as SessionPlayerId);
			});
			if (match) {
				return { ...match.population };
			}
		}
		return {};
	})();
	const hasPassives = 'passives' in playerState && playerState.passives;
	const passives = hasPassives
		? [...playerState.passives!]
		: context && 'id' in playerState
			? context.passives.list(playerState.id as SessionPlayerId)
			: [];
	return {
		resources: { ...playerState.resources },
		stats: { ...playerState.stats },
		population,
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
	});
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
	populations: {
		get(id: string): PopulationConfig;
		has?(id: string): boolean;
	};
	resources: TranslationResourceRegistry;
	stats: TranslationStatRegistry;
	info: TranslationInfo;
	passives: TranslationDiffContext['passives'];
}

export function diffSnapshots(
	previousSnapshot: PlayerSnapshot,
	nextSnapshot: PlayerSnapshot,
	context: DiffContext,
	resourceKeys: ResourceKey[] = collectResourceKeys(
		previousSnapshot,
		nextSnapshot,
	),
): string[] {
	const changeSummaries: string[] = [];
	const diffContext = createTranslationDiffContext(context);
	appendResourceChanges(
		changeSummaries,
		previousSnapshot,
		nextSnapshot,
		diffContext,
		resourceKeys,
	);
	appendStatChanges(
		changeSummaries,
		previousSnapshot,
		nextSnapshot,
		nextSnapshot,
		undefined,
		diffContext,
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
		diffContext,
	);
	appendPassiveChanges(
		changeSummaries,
		previousSnapshot,
		nextSnapshot,
		diffContext.info,
	);
	return changeSummaries;
}
