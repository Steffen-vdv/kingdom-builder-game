import type { EngineContext } from './context';
import type { PlayerState } from './state';
import type { PassiveSummary } from './services';

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

export function snapshotPlayer(
	player: PlayerState,
	ctx: EngineContext,
): PlayerSnapshot {
	return {
		resources: { ...player.resources },
		stats: { ...player.stats },
		buildings: Array.from(player.buildings),
		lands: player.lands.map((land) => ({
			id: land.id,
			slotsMax: land.slotsMax,
			slotsUsed: land.slotsUsed,
			developments: [...land.developments],
		})),
		passives: ctx.passives.list(player.id),
	};
}

export interface ActionTrace {
	id: string;
	before: PlayerSnapshot;
	after: PlayerSnapshot;
}
