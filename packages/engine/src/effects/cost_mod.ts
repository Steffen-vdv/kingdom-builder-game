import type { EffectHandler } from '.';
import type { ResourceKey } from '../state';

interface CostModParams {
  id: string;
  actionId?: string;
  key: ResourceKey;
  amount: number;
  [key: string]: unknown;
}

export const costMod: EffectHandler<CostModParams> = (effect, ctx) => {
  const { id, actionId, key, amount } = effect.params || ({} as CostModParams);
  if (!id || !key || amount === undefined) {
    throw new Error('cost_mod requires id, key, amount');
  }
  const ownerId = ctx.activePlayer.id;
  const modId = `${id}_${ownerId}`;
  if (effect.method === 'add') {
    ctx.passives.registerCostModifier(
      modId,
      (targetActionId, costs, innerCtx) => {
        if (
          innerCtx.activePlayer.id === ownerId &&
          (!actionId || targetActionId === actionId)
        ) {
          const current = costs[key] || 0;
          return { ...costs, [key]: current + amount };
        }
        return costs;
      },
    );
  } else if (effect.method === 'remove') {
    ctx.passives.unregisterCostModifier(modId);
  }
};
