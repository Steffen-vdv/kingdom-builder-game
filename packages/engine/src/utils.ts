import type { EffectDef } from './effects';

export function applyParamsToEffects<E extends EffectDef>(
  effects: E[],
  params: Record<string, unknown>,
): E[] {
  const replace = (val: unknown): unknown =>
    typeof val === 'string' && val.startsWith('$') ? params[val.slice(1)] : val;
  const mapEffect = (e: E): E => ({
    ...e,
    params: e.params
      ? (Object.fromEntries(
          Object.entries(e.params).map(([k, v]) => [k, replace(v)]),
        ) as E['params'])
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
