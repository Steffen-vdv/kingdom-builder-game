import type { EffectHandler } from '.';
import type { ResourceKey } from '../state';

interface CostModParams {
  id: string;
  actionId: string;
  key: ResourceKey;
  amount: number;
  [key: string]: unknown;
}

export const costMod: EffectHandler<CostModParams> = (effect, ctx) => {
  const { id, actionId, key, amount } = effect.params || ({} as CostModParams);
  if (!id || !actionId || !key || amount === undefined) {
    throw new Error('cost_mod requires id, actionId, key, amount');
  }
  if (effect.method === 'add') {
    ctx.passives.registerCostModifier(id, (act, costs) => {
      if (act === actionId) {
        const current = costs[key] || 0;
        return { ...costs, [key]: current + amount };
      }
      return costs;
    });
  } else if (effect.method === 'remove') {
    ctx.passives.unregisterCostModifier(id);
  }
};
