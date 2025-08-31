import type { EffectHandler } from '.';
import type { ResourceKey } from '../state';
import type { ResourceGain } from '../services';

interface TransferParams extends Record<string, unknown> {
  key: ResourceKey;
  percent?: number;
}

export const resourceTransfer: EffectHandler<TransferParams> = (
  effect,
  ctx,
  _mult = 1,
) => {
  const { key, percent } = effect.params!;
  const base = percent ?? 25;
  const mods: ResourceGain[] = [{ key, amount: base }];
  ctx.passives.runEvaluationMods('transfer_pct:percent', ctx, mods);
  const pct = mods[0]!.amount;
  const defender = ctx.opponent;
  const attacker = ctx.activePlayer;
  const available = defender.resources[key] || 0;
  let amount = Math.floor((available * pct) / 100);
  if (amount < 0) amount = 0;
  if (amount > available) amount = available;
  defender.resources[key] = available - amount;
  attacker.resources[key] = (attacker.resources[key] || 0) + amount;
};
