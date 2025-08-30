import type { EffectHandler } from '.';
import { runEffects } from '.';

interface ResultModParams {
  id: string;
  actionId?: string;
  evaluation?: { type: string; id: string };
  [key: string]: unknown;
}

export const resultMod: EffectHandler<ResultModParams> = (effect, ctx) => {
  const { id, actionId, evaluation } = effect.params || ({} as ResultModParams);
  if (!id || (!actionId && !evaluation))
    throw new Error('result_mod requires id and actionId or evaluation');
  const ownerId = ctx.activePlayer.id;
  const modId = `${id}_${ownerId}`;
  if (effect.method === 'add') {
    const effects = effect.effects || [];
    if (actionId)
      ctx.passives.registerResultModifier(
        modId,
        (executedActionId, innerContext) => {
          if (
            executedActionId === actionId &&
            innerContext.activePlayer.id === ownerId
          ) {
            runEffects(effects, innerContext);
          }
        },
      );
    else if (evaluation) {
      const target = `${evaluation.type}:${evaluation.id}`;
      ctx.passives.registerEvaluationModifier(modId, target, (innerContext) => {
        if (innerContext.activePlayer.id === ownerId)
          runEffects(effects, innerContext);
      });
    }
  } else if (effect.method === 'remove') {
    if (actionId) ctx.passives.unregisterResultModifier(modId);
    else if (evaluation) ctx.passives.unregisterEvaluationModifier(modId);
  }
};
