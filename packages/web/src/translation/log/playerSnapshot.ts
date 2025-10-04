import type {
	EngineContext,
	PassiveSummary,
	PlayerId,
} from '@kingdom-builder/engine';

import type { Land } from '../content';

export interface PlayerSnapshot {
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

interface SnapshotSource {
	id: string;
	resources: Record<string, number>;
	stats: Record<string, number>;
	buildings: Set<string> | string[];
	lands: Land[];
}

export function snapshotPlayer(
	player: SnapshotSource,
	ctx: EngineContext,
): PlayerSnapshot {
	const buildings = Array.isArray(player.buildings)
		? [...player.buildings]
		: Array.from(player.buildings ?? []);
	return {
		resources: { ...player.resources },
		stats: { ...player.stats },
		buildings,
		lands: player.lands.map((land) => ({
			id: land.id,
			slotsMax: land.slotsMax,
			slotsUsed: land.slotsUsed,
			developments: [...land.developments],
		})),
		passives: ctx.passives.list(player.id as PlayerId),
	};
}
