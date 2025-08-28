import type { EffectDef } from './effects';

export function applyParamsToEffects<E extends EffectDef>(
  effects: E[],
  params: Record<string, unknown>,
): E[] {
  const replace = (val: unknown): unknown =>
    typeof val === 'string' && val.startsWith('$') ? params[val.slice(1)] : val;
  const mapEffect = (effect: E): E => ({
    ...effect,
    params: effect.params
      ? (Object.fromEntries(
          Object.entries(effect.params).map(([key, value]) => [
            key,
            replace(value),
          ]),
        ) as E['params'])
      : undefined,
    evaluator: effect.evaluator
      ? {
          ...effect.evaluator,
          params: effect.evaluator.params
            ? Object.fromEntries(
                Object.entries(effect.evaluator.params).map(([key, value]) => [
                  key,
                  replace(value),
                ]),
              )
            : undefined,
        }
      : undefined,
    effects: effect.effects
      ? applyParamsToEffects(effect.effects, params)
      : undefined,
  });
  return effects.map(mapEffect);
}
