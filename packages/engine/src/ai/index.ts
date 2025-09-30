import type { EngineContext } from '../context';
import type { PlayerId } from '../state';
import type { ActionParams, AdvanceResult } from '../index';
import type { ActionTrace } from '../log';

export const TAX_ACTION_ID = 'tax';

type PerformActionResult = ActionTrace[] | void;

export type PerformActionFn = <T extends string>(
  actionId: T,
  ctx: EngineContext,
  params?: ActionParams<T>,
) => PerformActionResult | Promise<PerformActionResult>;

type AdvanceResultValue = AdvanceResult | void;

export type AdvanceFn = (
  ctx: EngineContext,
) => AdvanceResultValue | Promise<AdvanceResultValue>;

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

  constructor(private deps: AIDependencies) {}

  register(playerId: PlayerId, controller: AIController) {
    this.controllers.set(playerId, controller);
  }

  has(playerId: PlayerId) {
    return this.controllers.has(playerId);
  }

  async run(
    playerId: PlayerId,
    ctx: EngineContext,
    overrides?: Partial<AIDependencies>,
  ) {
    const controller = this.controllers.get(playerId);
    if (!controller) return false;
    const deps = { ...this.deps, ...(overrides || {}) } as AIDependencies;
    await controller(ctx, deps);
    return true;
  }
}

export function createAISystem(deps: AIDependencies) {
  return new AISystem(deps);
}

export function createTaxCollectorController(playerId: PlayerId): AIController {
  return async (ctx, deps) => {
    if (ctx.activePlayer.id !== playerId) return;
    const phase = ctx.phases[ctx.game.phaseIndex];
    if (!phase?.action) return;
    const apKey = ctx.actionCostResource;
    if (!apKey) return;

    const finishActionPhase = async () => {
      if (ctx.activePlayer.id !== playerId) return;
      if (!ctx.phases[ctx.game.phaseIndex]?.action) return;
      const remaining = ctx.activePlayer.resources[apKey];
      if (typeof remaining === 'number' && remaining > 0)
        ctx.activePlayer.resources[apKey] = 0;
      await deps.advance(ctx);
    };

    const definition = ctx.actions.get(TAX_ACTION_ID);
    if (!definition) {
      await finishActionPhase();
      return;
    }
    if (definition.system && !ctx.activePlayer.actions.has(TAX_ACTION_ID)) {
      await finishActionPhase();
      return;
    }

    while (
      ctx.activePlayer.id === playerId &&
      ctx.phases[ctx.game.phaseIndex]?.action &&
      (ctx.activePlayer.resources[apKey] ?? 0) > 0
    ) {
      try {
        await deps.performAction(TAX_ACTION_ID, ctx);
      } catch (err) {
        await finishActionPhase();
        return;
      }
    }

    if (
      ctx.activePlayer.id === playerId &&
      ctx.phases[ctx.game.phaseIndex]?.action &&
      (ctx.activePlayer.resources[apKey] ?? 0) === 0
    ) {
      await finishActionPhase();
    }
  };
}
