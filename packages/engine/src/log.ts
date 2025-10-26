import type { EngineContext } from './context';
import type { PlayerState } from './state';
import { Resource, Stat } from './state';
import { getResourceValue } from './resource-v2';
import type { PassiveSummary } from './services';
import type { SessionResourceBoundsV2 } from '@kingdom-builder/protocol';

export interface PlayerSnapshot {
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

function deriveLegacyResourceRecord(
	player: PlayerState,
): Record<string, number> {
	const snapshot: Record<string, number> = {};
	for (const resourceKey of Object.values(Resource)) {
		const resourceId = player.getResourceV2Id(resourceKey);
		snapshot[resourceKey] = getResourceValue(player, resourceId);
	}
	return snapshot;
}

function deriveLegacyStatRecord(player: PlayerState): Record<string, number> {
	const snapshot: Record<string, number> = {};
	for (const statKey of Object.values(Stat)) {
		const resourceId = player.getStatResourceV2Id(statKey);
		snapshot[statKey] = getResourceValue(player, resourceId);
	}
	return snapshot;
}

export function snapshotPlayer(
	player: PlayerState,
	engineContext: EngineContext,
): PlayerSnapshot {
	return {
		resources: deriveLegacyResourceRecord(player),
		stats: deriveLegacyStatRecord(player),
		valuesV2: cloneValuesV2(player),
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
