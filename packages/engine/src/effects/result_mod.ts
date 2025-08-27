import type { EffectHandler } from '.';
import { runEffects } from '.';

interface ResultModParams {
  id: string;
  actionId: string;
}

export const resultMod: EffectHandler = (effect, ctx) => {
  const { id, actionId } = (effect.params as Partial<ResultModParams>) || {};
  if (!id || !actionId) throw new Error('result_mod requires id and actionId');
  if (effect.method === 'add') {
    const effects = effect.effects || [];
    ctx.passives.registerResultModifier(id, (act, innerCtx) => {
      if (act === actionId) {
        runEffects(effects, innerCtx);
      }
    });
  } else if (effect.method === 'remove') {
    ctx.passives.unregisterResultModifier(id);
  }
};
