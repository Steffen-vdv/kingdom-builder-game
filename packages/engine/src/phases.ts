import { PHASES, type PhaseId, type PhaseStep } from './content/phases';
import type { EngineContext } from './context';
import { collectTriggerEffects } from './triggers';
import { runEffects } from './effects';
import type { EffectDef } from './effects';

export interface StepResult {
  phase: PhaseId;
  step: string;
  title: string;
  effects: EffectDef[];
}

export function startTurn(ctx: EngineContext, playerIndex: number) {
  ctx.game.currentPlayerIndex = playerIndex;
  ctx.game.phaseIndex = 0;
  ctx.game.stepIndex = 0;
  ctx.game.currentPhase = PHASES[0].id;
}

export function getCurrentStep(
  ctx: EngineContext,
): { phase: PhaseId; def: PhaseStep } | undefined {
  const phase = PHASES[ctx.game.phaseIndex];
  if (!phase) return undefined;
  const def = phase.steps[ctx.game.stepIndex];
  if (!def) return undefined;
  return { phase: phase.id, def };
}

export function runCurrentStep(ctx: EngineContext): StepResult | undefined {
  const info = getCurrentStep(ctx);
  if (!info) return undefined;
  const { phase, def } = info;
  let effects: ReturnType<typeof collectTriggerEffects> = [];
  if (def.trigger) {
    effects = collectTriggerEffects(def.trigger, ctx, ctx.activePlayer, def.id);
    for (const effect of effects) runEffects([effect], ctx);
  }
  if (def.effects) {
    runEffects(def.effects, ctx);
    effects = [...effects, ...def.effects];
  }
  ctx.game.stepIndex += 1;
  const phaseDef = PHASES[ctx.game.phaseIndex]!;
  if (ctx.game.stepIndex >= phaseDef.steps.length) {
    ctx.game.phaseIndex += 1;
    ctx.game.stepIndex = 0;
    const nextPhase = PHASES[ctx.game.phaseIndex];
    if (nextPhase) ctx.game.currentPhase = nextPhase.id;
  }
  return { phase, step: def.id, title: def.title, effects };
}

export { PHASES };
export type { PhaseId };
