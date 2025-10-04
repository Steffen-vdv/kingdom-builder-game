import {
	type EngineContext,
	type PassiveSummary,
	type PlayerId,
} from '@kingdom-builder/engine';
import { type Land } from '../content';

export interface PlayerSnapshot {
	resources: Record<string, number>;
	stats: Record<string, number>;
	buildings: string[];
	lands: Array<{
		id: string;
		slotsMax: number;
		slotsUsed: number;
		developments: string[];
	}>;
	passives: PassiveSummary[];
}

export function snapshotPlayer(
	player: {
		id: string;
		resources: Record<string, number>;
		stats: Record<string, number>;
		buildings: Set<string>;
		lands: Land[];
	},
	context: EngineContext,
): PlayerSnapshot {
	const playerId = player.id as PlayerId;
	const passiveSummaries = context.passives.list(playerId);
	return {
		resources: { ...player.resources },
		stats: { ...player.stats },
		buildings: Array.from(player.buildings ?? []),
		lands: player.lands.map((land) => ({
			id: land.id,
			slotsMax: land.slotsMax,
			slotsUsed: land.slotsUsed,
			developments: [...land.developments],
		})),
		passives: passiveSummaries,
	};
}
