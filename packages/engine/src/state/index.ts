export const Resource: Record<string, string> = {};
export type ResourceKey = string;
export function setResourceKeys(keys: string[]) {
  for (const key of Object.keys(Resource)) delete Resource[key];
  for (const key of keys) Resource[key] = key;
}

export const Stat: Record<string, string> = {};
export type StatKey = string;
export function setStatKeys(keys: string[]) {
  for (const key of Object.keys(Stat)) delete Stat[key];
  for (const key of keys) Stat[key] = key;
}

export const Phase = {
  Development: 'development',
  Upkeep: 'upkeep',
  Main: 'main',
} as const;
export type PhaseId = (typeof Phase)[keyof typeof Phase];

export const PopulationRole = {
  Council: 'council',
  Commander: 'commander',
  Fortifier: 'fortifier',
  Citizen: 'citizen',
} as const;
export type PopulationRoleId =
  (typeof PopulationRole)[keyof typeof PopulationRole];

export type PlayerId = 'A' | 'B';

export class Land {
  id: string;
  slotsMax: number;
  slotsUsed = 0;
  developments: string[] = [];
  tilled = false;
  constructor(id: string, slotsMax: number, tilled = false) {
    this.id = id;
    this.slotsMax = slotsMax;
    this.tilled = tilled;
  }
  get slotsFree() {
    return this.slotsMax - this.slotsUsed;
  }
}

export class PlayerState {
  id: PlayerId;
  name: string;
  resources: Record<ResourceKey, number>;
  stats: Record<StatKey, number>;
  /**
   * Tracks whether a stat has ever been non-zero. This allows the UI to hide
   * stats that are zero and have never changed while still showing stats that
   * returned to zero after previously having a value.
   */
  statsHistory: Record<StatKey, boolean>;
  population: Record<PopulationRoleId, number> = {
    [PopulationRole.Council]: 0,
    [PopulationRole.Commander]: 0,
    [PopulationRole.Fortifier]: 0,
    [PopulationRole.Citizen]: 0,
  };
  lands: Land[] = [];
  buildings: Set<string> = new Set();
  actions: Set<string> = new Set();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
  constructor(id: PlayerId, name: string) {
    this.id = id;
    this.name = name;
    this.resources = {};
    for (const key of Object.values(Resource)) {
      this.resources[key] = 0;
      Object.defineProperty(this, key, {
        get: () => this.resources[key],
        set: (v: number) => {
          this.resources[key] = v;
        },
        enumerable: false,
        configurable: true,
      });
    }
    this.stats = {};
    this.statsHistory = {};
    for (const key of Object.values(Stat)) {
      this.stats[key] = 0;
      this.statsHistory[key] = false;
      Object.defineProperty(this, key, {
        get: () => this.stats[key],
        set: (v: number) => {
          this.stats[key] = v;
          if (v !== 0) this.statsHistory[key] = true;
        },
        enumerable: false,
        configurable: true,
      });
    }
  }
}

export class GameState {
  turn = 1;
  currentPlayerIndex = 0; // multi-player friendly
  currentPhase = '';
  currentStep = '';
  phaseIndex = 0;
  stepIndex = 0;
  players: PlayerState[];
  constructor(aName = 'Player A', bName = 'Player B') {
    this.players = [new PlayerState('A', aName), new PlayerState('B', bName)];
  }
  get active(): PlayerState {
    return this.players[this.currentPlayerIndex]!;
  }
  get opponent(): PlayerState {
    return this.players[(this.currentPlayerIndex + 1) % this.players.length]!;
  }
}
