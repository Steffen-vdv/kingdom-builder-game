import type { EffectHandler, EffectDef } from '.';

interface PassiveParams {
  id: string;
  onGrowthPhase?: EffectDef[];
  onUpkeepPhase?: EffectDef[];
  onBeforeAttacked?: EffectDef[];
  onAttackResolved?: EffectDef[];
  [key: string]: unknown;
}

export const passiveAdd: EffectHandler<PassiveParams> = (
  effect,
  ctx,
  mult = 1,
) => {
  const params = effect.params || ({} as PassiveParams);
  const {
    id,
    onGrowthPhase,
    onUpkeepPhase,
    onBeforeAttacked,
    onAttackResolved,
  } = params;
  if (!id) throw new Error('passive:add requires id');
  const passive: {
    id: string;
    effects: EffectDef[];
    onGrowthPhase?: EffectDef[];
    onUpkeepPhase?: EffectDef[];
    onBeforeAttacked?: EffectDef[];
    onAttackResolved?: EffectDef[];
  } = { id, effects: effect.effects || [] };
  if (onGrowthPhase) passive.onGrowthPhase = onGrowthPhase;
  if (onUpkeepPhase) passive.onUpkeepPhase = onUpkeepPhase;
  if (onBeforeAttacked) passive.onBeforeAttacked = onBeforeAttacked;
  if (onAttackResolved) passive.onAttackResolved = onAttackResolved;
  for (let index = 0; index < Math.floor(mult); index++) {
    ctx.passives.addPassive(passive, ctx);
  }
};
