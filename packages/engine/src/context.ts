import type { GameState, ResourceKey } from './state';
import type { Services, PassiveManager } from './services';
import type { Registry } from './registry';
import type { ActionDef } from './content/actions';
import type { BuildingDef } from './content/buildings';
import type { DevelopmentDef } from './content/developments';
import type { PopulationDef } from './content/populations';
import type { PhaseDef } from './content/phases';

export class EngineContext {
  constructor(
    public game: GameState,
    public services: Services,
    public actions: Registry<ActionDef>,
    public buildings: Registry<BuildingDef>,
    public developments: Registry<DevelopmentDef>,
    public populations: Registry<PopulationDef>,
    public passives: PassiveManager,
    public phases: PhaseDef[],
  ) {}
  recentResourceGains: { key: ResourceKey; amount: number }[] = [];
  recentEvaluations: {
    target: string;
    base: { key: ResourceKey; amount: number }[];
    gains: { key: ResourceKey; amount: number }[];
    modifiers: {
      source: string;
      gains: { key: ResourceKey; amount: number }[];
    }[];
  }[] = [];
  get activePlayer() {
    return this.game.active;
  }
  get opponent() {
    return this.game.opponent;
  }
}
