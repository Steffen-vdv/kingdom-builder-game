import type { EngineContext } from './context';
import type { PlayerState } from './state';
import type { PassiveSummary } from './services';
import { getResourceValue, type ResourceV2Metadata } from './resourceV2';

type PlayerSnapshotValueKind = 'resource' | 'group-parent' | 'stat';

export interface PlayerSnapshot {
	values: Record<string, number>;
	valueKinds: Record<string, PlayerSnapshotValueKind>;
	valueOrder: readonly string[];
	resources: Record<string, number>;
	stats: Record<string, number>;
	buildings: string[];
	lands: {
		id: string;
		slotsMax: number;
		slotsUsed: number;
		developments: string[];
	}[];
	passives: PassiveSummary[];
}

function extractOrderedValues(
	player: PlayerState,
	metadata: ResourceV2Metadata | undefined,
): {
	values: Record<string, number>;
	kinds: Record<string, PlayerSnapshotValueKind>;
	order: readonly string[];
} {
	const values: Record<string, number> = {};
	const kinds: Record<string, PlayerSnapshotValueKind> = {};
	if (!metadata || !player.resourceV2) {
		const resourceKeys = Object.keys(player.resources);
		const statKeys = Object.keys(player.stats);
		const combined = Array.from(new Set([...resourceKeys, ...statKeys]));
		combined.sort();
		for (const key of combined) {
			if (key in player.stats) {
				values[key] = player.stats[key] ?? 0;
				kinds[key] = 'stat';
			} else {
				values[key] = player.resources[key] ?? 0;
				kinds[key] = 'resource';
			}
		}
		return {
			values,
			kinds,
			order: Object.freeze(combined),
		};
	}
	const order: string[] = [];
	for (const id of metadata.orderedValueIds) {
		const definition = metadata.values.get(id);
		if (!definition) {
			continue;
		}
		values[id] = getResourceValue(player.resourceV2, id);
		kinds[id] = definition.kind;
		order.push(id);
	}
	for (const statKey of Object.keys(player.stats)) {
		if (statKey in values) {
			continue;
		}
		values[statKey] = player.stats[statKey] ?? 0;
		kinds[statKey] = 'stat';
		order.push(statKey);
	}
	return {
		values,
		kinds,
		order: Object.freeze(order.slice()),
	};
}

export function snapshotPlayer(
	player: PlayerState,
	engineContext: EngineContext,
): PlayerSnapshot {
	const { values, kinds, order } = extractOrderedValues(
		player,
		engineContext.resourceV2Metadata,
	);
	return {
		values,
		valueKinds: kinds,
		valueOrder: order,
		resources: { ...player.resources },
		stats: { ...player.stats },
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
