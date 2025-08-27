import type { GameState } from './state';
import type { Services, PassiveManager } from './services';
import type { Registry } from './registry';
import type { ActionDef } from './content/actions';
import type { BuildingDef } from './content/buildings';
import type { DevelopmentDef } from './content/developments';
import type { PopulationDef } from './content/populations';

export class EngineContext {
  constructor(
    public game: GameState,
    public services: Services,
    public actions: Registry<ActionDef>,
    public buildings: Registry<BuildingDef>,
    public developments: Registry<DevelopmentDef>,
    public populations: Registry<PopulationDef>,
    public passives: PassiveManager,
  ) {}
  get activePlayer() {
    return this.game.active;
  }
  get opponent() {
    return this.game.opponent;
  }
}
