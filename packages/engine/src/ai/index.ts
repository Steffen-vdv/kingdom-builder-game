import type { EngineContext } from '../context';
import type { PlayerId } from '../state';
import type { ActionParams } from '../index';

export type PerformActionFn = <T extends string>(
  actionId: T,
  ctx: EngineContext,
  params?: ActionParams<T>,
) => unknown;

export type AdvanceFn = (ctx: EngineContext) => unknown;

export interface AIDependencies {
  performAction: PerformActionFn;
  advance: AdvanceFn;
}

export type AIController = (
  ctx: EngineContext,
  deps: AIDependencies,
) => Promise<void> | void;

export class AISystem {
  private controllers = new Map<PlayerId, AIController>();

  constructor(private readonly deps: AIDependencies) {}

  register(playerId: PlayerId, controller: AIController) {
    this.controllers.set(playerId, controller);
  }

  has(playerId: PlayerId) {
    return this.controllers.has(playerId);
  }

  async run(playerId: PlayerId, ctx: EngineContext) {
    const controller = this.controllers.get(playerId);
    if (!controller) return false;
    await controller(ctx, this.deps);
    return true;
  }
}

export function createAISystem(deps: AIDependencies) {
  return new AISystem(deps);
}

export function createTaxCollectorController(playerId: PlayerId): AIController {
  return (ctx, deps) => {
    if (ctx.activePlayer.id !== playerId) return;
    const phase = ctx.phases[ctx.game.phaseIndex];
    if (!phase?.action) return;
    const apKey = ctx.actionCostResource;
    if (!apKey) return;
    if (!ctx.activePlayer.actions.has('tax')) return;

    while (
      ctx.activePlayer.id === playerId &&
      ctx.phases[ctx.game.phaseIndex]?.action &&
      (ctx.activePlayer.resources[apKey] ?? 0) > 0
    ) {
      try {
        deps.performAction('tax', ctx);
      } catch (err) {
        break;
      }
    }

    if (
      ctx.activePlayer.id === playerId &&
      ctx.phases[ctx.game.phaseIndex]?.action &&
      (ctx.activePlayer.resources[apKey] ?? 0) === 0
    ) {
      deps.advance(ctx);
    }
  };
}
