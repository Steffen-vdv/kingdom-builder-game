import type { EffectDef } from './effects';

export function applyParamsToEffects(
  effects: EffectDef[],
  params: Record<string, any>,
): EffectDef[] {
  const replace = (val: any) =>
    typeof val === 'string' && val.startsWith('$') ? params[val.slice(1)] : val;
  const mapEffect = (e: EffectDef): EffectDef => ({
    ...e,
    params: e.params
      ? Object.fromEntries(
          Object.entries(e.params).map(([k, v]) => [k, replace(v)]),
        )
      : undefined,
    evaluator: e.evaluator
      ? {
          ...e.evaluator,
          params: e.evaluator.params
            ? Object.fromEntries(
                Object.entries(e.evaluator.params).map(([k, v]) => [
                  k,
                  replace(v),
                ]),
              )
            : undefined,
        }
      : undefined,
    effects: e.effects ? applyParamsToEffects(e.effects, params) : undefined,
  });
  return effects.map(mapEffect);
}
