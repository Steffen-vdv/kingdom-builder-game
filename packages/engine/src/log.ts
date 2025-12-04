import type { EngineContext } from './context';
import type { PlayerState } from './state';
import type { PassiveSummary } from './services';
import type { SessionResourceBoundsV2 } from '@kingdom-builder/protocol';

export interface PlayerSnapshot {
	// All values are now unified in valuesV2 - resources/stats are kept for
	// backward compatibility but contain the same data
	resources: Record<string, number>;
	stats: Record<string, number>;
	valuesV2: Record<string, number>;
	resourceBoundsV2: Record<string, SessionResourceBoundsV2>;
	buildings: string[];
	lands: {
		id: string;
		slotsMax: number;
		slotsUsed: number;
		developments: string[];
	}[];
	passives: PassiveSummary[];
}

function cloneValuesV2(player: PlayerState): Record<string, number> {
	const snapshot: Record<string, number> = {};
	for (const [resourceId, value] of Object.entries(player.resourceValues)) {
		snapshot[resourceId] = value ?? 0;
	}
	return snapshot;
}

function buildResourceBoundsSnapshot(
	player: PlayerState,
): Record<string, SessionResourceBoundsV2> {
	const snapshot: Record<string, SessionResourceBoundsV2> = {};
	const keys = new Set(
		Object.keys(player.resourceValues).concat(
			Object.keys(player.resourceLowerBounds),
			Object.keys(player.resourceUpperBounds),
		),
	);
	for (const resourceId of keys) {
		const lower = player.resourceLowerBounds[resourceId] ?? null;
		const upper = player.resourceUpperBounds[resourceId] ?? null;
		snapshot[resourceId] = { lowerBound: lower, upperBound: upper };
	}
	return snapshot;
}

export function snapshotPlayer(
	player: PlayerState,
	engineContext: EngineContext,
): PlayerSnapshot {
	// All values live in valuesV2 now - resources/stats point to the same data
	// for backward compatibility with consumers that haven't migrated yet
	const valuesV2 = cloneValuesV2(player);
	return {
		resources: valuesV2,
		stats: valuesV2,
		valuesV2,
		resourceBoundsV2: buildResourceBoundsSnapshot(player),
		buildings: Array.from(player.buildings),
		lands: player.lands.map((land) => ({
			id: land.id,
			slotsMax: land.slotsMax,
			slotsUsed: land.slotsUsed,
			developments: [...land.developments],
		})),
		passives: engineContext.passives.list(player.id),
	};
}

export interface ActionTrace {
	id: string;
	before: PlayerSnapshot;
	after: PlayerSnapshot;
}
