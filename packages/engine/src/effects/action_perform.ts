import type { EffectHandler } from '.';
import { applyParamsToEffects } from '../utils';
import { runEffects } from '.';
import { snapshotPlayer } from '../log';

export const actionPerform: EffectHandler = (effect, ctx, mult = 1) => {
  const id = effect.params?.['id'] as string;
  if (!id) throw new Error('action:perform requires id');
  const params = effect.params as Record<string, unknown>;
  for (let i = 0; i < Math.floor(mult); i++) {
    const def = ctx.actions.get(id);
    const before = snapshotPlayer(ctx.activePlayer, ctx);
    const resolved = applyParamsToEffects(def.effects, params);
    runEffects(resolved, ctx);
    ctx.passives.runResultMods(def.id, ctx);
    const after = snapshotPlayer(ctx.activePlayer, ctx);
    ctx.actionTraces.push({ id: def.id, before, after });
  }
};
