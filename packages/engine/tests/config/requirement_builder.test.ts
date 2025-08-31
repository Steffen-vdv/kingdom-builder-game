import { describe, it, expect } from 'vitest';
import { requirement } from '../../src/config/builders.ts';
import { Stat, PopulationRole } from '../../src/state/index.ts';

describe('RequirementBuilder', () => {
  it('builds requirement configs with params', () => {
    const req = requirement('evaluator', 'compare')
      .param('left', { type: 'stat', params: { key: Stat.warWeariness } })
      .param('operator', 'lt')
      .param('right', {
        type: 'population',
        params: { role: PopulationRole.Commander },
      })
      .message('War weariness must be lower than commanders')
      .build();

    expect(req).toEqual({
      type: 'evaluator',
      method: 'compare',
      params: {
        left: { type: 'stat', params: { key: Stat.warWeariness } },
        operator: 'lt',
        right: {
          type: 'population',
          params: { role: PopulationRole.Commander },
        },
      },
      message: 'War weariness must be lower than commanders',
    });
  });
});
