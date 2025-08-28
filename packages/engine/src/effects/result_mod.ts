import type { EffectHandler } from '.';
import { runEffects } from '.';

interface ResultModParams {
  id: string;
  actionId: string;
  [key: string]: unknown;
}

export const resultMod: EffectHandler<ResultModParams> = (effect, ctx) => {
  const { id, actionId } = effect.params || ({} as ResultModParams);
  if (!id || !actionId) throw new Error('result_mod requires id and actionId');
  if (effect.method === 'add') {
    const effects = effect.effects || [];
    ctx.passives.registerResultModifier(
      id,
      (executedActionId, innerContext) => {
        if (executedActionId === actionId) {
          runEffects(effects, innerContext);
        }
      },
    );
  } else if (effect.method === 'remove') {
    ctx.passives.unregisterResultModifier(id);
  }
};
