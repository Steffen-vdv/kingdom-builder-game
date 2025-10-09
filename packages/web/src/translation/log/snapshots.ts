import type {
	SessionPassiveSummary,
	SessionPlayerId,
	SessionPlayerStateSnapshot,
} from '@kingdom-builder/protocol';
import type { ActionPlayerSnapshot } from '@kingdom-builder/protocol/actions';
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
import {
	createTranslationDiffContext,
	type TranslationDiffContextSource,
} from './resourceSources/context';

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
	| ActionPlayerSnapshot;

interface SnapshotContext {
	game?: {
		players: Array<{
			id: SessionPlayerId;
			population: Record<string, number>;
		}>;
	};
	passives?: {
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
			const players = context.game?.players ?? [];
			const match = players.find((entry) => {
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
		: context && 'id' in playerState && context.passives
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
	}) as ResourceKey[];
}

export function diffSnapshots(
	previousSnapshot: PlayerSnapshot,
	nextSnapshot: PlayerSnapshot,
	context: TranslationDiffContextSource,
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
		nextSnapshot,
		undefined,
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
	appendSlotChanges(changeSummaries, previousSnapshot, nextSnapshot);
	appendPassiveChanges(changeSummaries, previousSnapshot, nextSnapshot);
	return changeSummaries;
}
