import type { EngineContext } from './context';
import type { PlayerState } from './state';

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
  passives: string[];
}

export function snapshotPlayer(
  player: PlayerState,
  ctx: EngineContext,
): PlayerSnapshot {
  return {
    resources: { ...player.resources },
    stats: { ...player.stats },
    buildings: Array.from(player.buildings),
    lands: player.lands.map((l) => ({
      id: l.id,
      slotsMax: l.slotsMax,
      slotsUsed: l.slotsUsed,
      developments: [...l.developments],
    })),
    passives: ctx.passives.list(player.id),
  };
}

export interface ActionTrace {
  id: string;
  before: PlayerSnapshot;
  after: PlayerSnapshot;
}
