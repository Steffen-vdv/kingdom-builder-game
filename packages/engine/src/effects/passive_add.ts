import type { EffectHandler, EffectDef } from '.';

interface PassiveParams {
  id: string;
  onDevelopmentPhase?: EffectDef[];
  onUpkeepPhase?: EffectDef[];
  onAttackResolved?: EffectDef[];
  [key: string]: unknown;
}

export const passiveAdd: EffectHandler<PassiveParams> = (
  effect,
  ctx,
  mult = 1,
) => {
  const params = effect.params || ({} as PassiveParams);
  const { id, onDevelopmentPhase, onUpkeepPhase, onAttackResolved } = params;
  if (!id) throw new Error('passive:add requires id');
  const passive: {
    id: string;
    effects: EffectDef[];
    onDevelopmentPhase?: EffectDef[];
    onUpkeepPhase?: EffectDef[];
    onAttackResolved?: EffectDef[];
  } = { id, effects: effect.effects || [] };
  if (onDevelopmentPhase)
    passive.onDevelopmentPhase = onDevelopmentPhase.map((e) => ({ ...e }));
  if (onUpkeepPhase)
    passive.onUpkeepPhase = onUpkeepPhase.map((e) => ({ ...e }));
  if (onAttackResolved)
    passive.onAttackResolved = onAttackResolved.map((e) => ({ ...e }));
  for (let index = 0; index < Math.floor(mult); index++) {
    ctx.passives.addPassive(passive, ctx);
  }
};
