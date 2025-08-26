export type ResourceKey = string; // e.g., "gold", "ap", "happiness", "castleHP"

export const R = {
  gold: "gold",
  ap: "ap",
  happiness: "happiness",
  castleHP: "castleHP",
} as const;

export const Phase = {
  Development: "development",
  Upkeep: "upkeep",
  Main: "main",
} as const;
export type PhaseId = typeof Phase[keyof typeof Phase];

export const Role = {
  Council: "council",
  Commander: "commander",
  Fortifier: "fortifier",
  Citizen: "citizen",
} as const;
export type RoleId = typeof Role[keyof typeof Role];

export type PlayerId = "A" | "B";

export class Land {
  id: string;
  slotsMax: number;
  slotsUsed = 0;
  developments: string[] = [];
  constructor(id: string, slotsMax: number) {
    this.id = id;
    this.slotsMax = slotsMax;
  }
  get slotsFree() { return this.slotsMax - this.slotsUsed; }
}

export class PlayerState {
  id: PlayerId;
  name: string;
  resources: Record<ResourceKey, number> = { [R.gold]: 0, [R.ap]: 0, [R.happiness]: 0, [R.castleHP]: 10 };
  roles: Record<RoleId, number> = { [Role.Council]: 0, [Role.Commander]: 0, [Role.Fortifier]: 0, [Role.Citizen]: 0 };
  lands: Land[] = [];
  buildings: Set<string> = new Set();
  constructor(id: PlayerId, name: string) { this.id = id; this.name = name; }
  get gold() { return this.resources[R.gold]; }
  set gold(v: number) { this.resources[R.gold] = v; }
  get ap() { return this.resources[R.ap]; }
  set ap(v: number) { this.resources[R.ap] = v; }
  get happiness() { return this.resources[R.happiness]; }
  set happiness(v: number) { this.resources[R.happiness] = v; }
}

export class GameState {
  turn = 1;
  currentPlayerIndex = 0; // multi-player friendly
  currentPhase: PhaseId = Phase.Development;
  players: PlayerState[];
  constructor(aName = "Steph", bName = "Byte") {
    this.players = [new PlayerState("A", aName), new PlayerState("B", bName)];
  }
  get active(): PlayerState { return this.players[this.currentPlayerIndex]; }
  get opponent(): PlayerState { return this.players[(this.currentPlayerIndex + 1) % this.players.length]; }
}
