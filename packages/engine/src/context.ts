import type { GameState, ResourceKey } from './state';
import type { Services, PassiveManager } from './services';
import type { Registry } from './registry';
import type {
  ActionConfig,
  BuildingConfig,
  DevelopmentConfig,
  PopulationConfig,
} from './config/schema';
import type { PhaseDef } from './phases';
type ActionDef = ActionConfig;
type BuildingDef = BuildingConfig;
type DevelopmentDef = DevelopmentConfig;
type PopulationDef = PopulationConfig;

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
  // Cache base values for stat:add_pct per turn/phase/step to ensure
  // additive scaling when effects are evaluated multiple times in the
  // same step (e.g. multiple leaders raising strength).
  statAddPctBases: Record<string, number> = {};
  statAddPctAccums: Record<string, number> = {};
  get activePlayer() {
    return this.game.active;
  }
  get opponent() {
    return this.game.opponent;
  }
}
