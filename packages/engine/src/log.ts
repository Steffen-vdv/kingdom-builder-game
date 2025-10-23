import type { SessionResourceValueSnapshotMap } from '@kingdom-builder/protocol';
import type { EngineContext } from './context';
import type { PlayerState } from './state';
import type { PassiveSummary } from './services';
import { snapshotResourceValues } from './runtime/player_snapshot';

export interface PlayerSnapshot {
	values?: SessionResourceValueSnapshotMap;
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
	engineContext: EngineContext,
): PlayerSnapshot {
	const values = snapshotResourceValues(player);
	return {
		...(values ? { values } : {}),
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
