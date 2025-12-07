import type { EngineContext } from './context';
import type { PlayerState } from './state';
import type { PassiveSummary } from './services';
import type { SessionResourceBounds } from '@kingdom-builder/protocol';

export interface PlayerSnapshot {
	/**
	 * Unified Resource value map containing all resources, stats, and
	 * population counts keyed by their identifiers.
	 */
	values: Record<string, number>;
	resourceBounds: Record<string, SessionResourceBounds>;
	buildings: string[];
	lands: {
		id: string;
		slotsMax: number;
		slotsUsed: number;
		developments: string[];
	}[];
	passives: PassiveSummary[];
}

function cloneValues(player: PlayerState): Record<string, number> {
	const snapshot: Record<string, number> = {};
	for (const [resourceId, value] of Object.entries(player.resourceValues)) {
		snapshot[resourceId] = value ?? 0;
	}
	return snapshot;
}

function buildResourceBoundsSnapshot(
	player: PlayerState,
): Record<string, SessionResourceBounds> {
	const snapshot: Record<string, SessionResourceBounds> = {};
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
	return {
		values: cloneValues(player),
		resourceBounds: buildResourceBoundsSnapshot(player),
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
