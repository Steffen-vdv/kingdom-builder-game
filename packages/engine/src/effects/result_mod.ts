import type { EffectHandler } from '.';
import { runEffects } from '.';

interface ResultModParams {
  id: string;
  actionId: string;
  player?: 'self' | 'opponent';
  [key: string]: unknown;
}

export const resultMod: EffectHandler<ResultModParams> = (effect, ctx) => {
  const { id, actionId, player } = effect.params || ({} as ResultModParams);
  if (!id || !actionId) throw new Error('result_mod requires id and actionId');
  const ownerId = ctx.activePlayer.id;
  const targetId = player === 'opponent' ? ctx.opponent.id : ownerId;
  const scopedId = `${ownerId}:${id}`;
  if (effect.method === 'add') {
    const effects = effect.effects || [];
    ctx.passives.registerResultModifier(
      scopedId,
      (executedActionId, innerContext) => {
        if (
          executedActionId === actionId &&
          innerContext.activePlayer.id === targetId
        ) {
          runEffects(effects, innerContext);
        }
      },
    );
  } else if (effect.method === 'remove') {
    ctx.passives.unregisterResultModifier(scopedId);
  }
};
