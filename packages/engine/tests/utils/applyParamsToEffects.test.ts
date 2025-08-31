import { describe, it, expect } from 'vitest';
import { applyParamsToEffects } from '../../src/utils.ts';
import { Resource } from '../../src/state/index.ts';

describe('applyParamsToEffects', () => {
  it('replaces placeholders in params, evaluator and nested effects', () => {
    const effects = [
      {
        type: 'resource',
        method: 'add',
        params: { key: '$key', amount: '$amount' },
        evaluator: { type: 'dummy', params: { times: '$count' } },
        effects: [
          {
            type: 'resource',
            method: 'add',
            params: { key: '$nestedKey', amount: '$nestedAmount' },
          },
        ],
      },
    ];
    const params = {
      key: Resource.gold,
      amount: 2,
      count: 3,
      nestedKey: Resource.ap,
      nestedAmount: 1,
    };
    const applied = applyParamsToEffects(effects, params);
    const effect = applied[0]!;
    expect(effect.params?.key).toBe(params.key);
    expect(effect.params?.amount).toBe(params.amount);
    expect(effect.evaluator?.params?.times).toBe(params.count);
    expect(effect.effects?.[0]?.params?.key).toBe(params.nestedKey);
    expect(effect.effects?.[0]?.params?.amount).toBe(params.nestedAmount);
  });

  it('leaves non-placeholder strings untouched', () => {
    const effects = [
      {
        type: 'resource',
        method: 'add',
        params: { key: 'static', amount: '$amount' },
      },
    ];
    const applied = applyParamsToEffects(effects, { amount: 5 });
    expect(applied[0]?.params?.key).toBe('static');
    expect(applied[0]?.params?.amount).toBe(5);
  });
});
