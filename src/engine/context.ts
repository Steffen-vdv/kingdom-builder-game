import { GameState } from "./state";
import { Services, PassiveManager } from "./services";
import { Registry } from "./registry";
import type { ActionDef } from "./actions";
import type { BuildingDef } from "./buildings";

export class EngineContext {
  constructor(
    public game: GameState,
    public services: Services,
    public actions: Registry<ActionDef>,
    public buildings: Registry<BuildingDef>,
    public passives: PassiveManager,
  ) {}
  get activePlayer() { return this.game.active; }
  get opponent() { return this.game.opponent; }
}
