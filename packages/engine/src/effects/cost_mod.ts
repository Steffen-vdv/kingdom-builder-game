import type { EffectHandler } from '.';
import type { ResourceKey } from '../state';

interface CostModParams extends Record<string, unknown> {
  id: string;
  actionId: string;
  key: ResourceKey;
  amount: number;
}

export const costMod: EffectHandler<CostModParams> = (effect, ctx) => {
  const { id, actionId, key, amount } =
    (effect.params as CostModParams) || ({} as CostModParams);
  if (!id || !actionId || !key || amount === undefined) {
    throw new Error('cost_mod requires id, actionId, key, amount');
  }
  if (effect.method === 'add') {
    ctx.passives.registerCostModifier(id, (act, costs) => {
      if (act === actionId) {
        const k = key as ResourceKey;
        const current = costs[k] || 0;
        return { ...costs, [k]: current + (amount as number) };
      }
      return costs;
    });
  } else if (effect.method === 'remove') {
    ctx.passives.unregisterCostModifier(id);
  }
};
