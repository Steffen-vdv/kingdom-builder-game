export const Resource = {
  gold: 'gold',
  ap: 'ap',
  happiness: 'happiness',
  castleHP: 'castleHP',
} as const;
export type ResourceKey = (typeof Resource)[keyof typeof Resource];

export const Stat = {
  maxPopulation: 'maxPopulation',
  armyStrength: 'armyStrength',
  fortificationStrength: 'fortificationStrength',
  absorption: 'absorption',
} as const;
export type StatKey = (typeof Stat)[keyof typeof Stat];

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
  constructor(id: PlayerId, name: string) {
    this.id = id;
    this.name = name;
    this.resources = {
      [Resource.gold]: 0,
      [Resource.ap]: 0,
      [Resource.happiness]: 0,
      [Resource.castleHP]: 10,
    };
    this.stats = {} as Record<StatKey, number>;
    this.statsHistory = {} as Record<StatKey, boolean>;
    for (const key of Object.values(Stat) as StatKey[]) {
      const value = key === Stat.maxPopulation ? 1 : 0;
      this.stats[key] = value;
      this.statsHistory[key] = value !== 0;
    }
  }
  get gold() {
    return this.resources[Resource.gold];
  }
  set gold(v: number) {
    this.resources[Resource.gold] = v;
  }
  get ap() {
    return this.resources[Resource.ap];
  }
  set ap(v: number) {
    this.resources[Resource.ap] = v;
  }
  get happiness() {
    return this.resources[Resource.happiness];
  }
  set happiness(v: number) {
    this.resources[Resource.happiness] = v;
  }
  get maxPopulation() {
    return this.stats[Stat.maxPopulation];
  }
  set maxPopulation(v: number) {
    this.stats[Stat.maxPopulation] = v;
    if (v !== 0) this.statsHistory[Stat.maxPopulation] = true;
  }
  get armyStrength() {
    return this.stats[Stat.armyStrength];
  }
  set armyStrength(v: number) {
    this.stats[Stat.armyStrength] = v;
    if (v !== 0) this.statsHistory[Stat.armyStrength] = true;
  }
  get fortificationStrength() {
    return this.stats[Stat.fortificationStrength];
  }
  set fortificationStrength(v: number) {
    this.stats[Stat.fortificationStrength] = v;
    if (v !== 0) this.statsHistory[Stat.fortificationStrength] = true;
  }
  get absorption() {
    return this.stats[Stat.absorption];
  }
  set absorption(v: number) {
    this.stats[Stat.absorption] = v;
    if (v !== 0) this.statsHistory[Stat.absorption] = true;
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
