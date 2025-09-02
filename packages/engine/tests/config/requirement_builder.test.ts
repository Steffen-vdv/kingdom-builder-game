import { describe, it, expect } from 'vitest';
import { requirement } from '@kingdom-builder/contents/config/builders';
import { Stat, PopulationRole } from '@kingdom-builder/contents';

describe('RequirementBuilder', () => {
  it('builds requirement configs with params', () => {
    const req = requirement('evaluator', 'compare')
      .param('left', { type: 'stat', params: { key: Stat.warWeariness } })
      .param('operator', 'lt')
      .param('right', {
        type: 'population',
        params: { role: PopulationRole.Legion },
      })
      .message('War weariness must be lower than legions')
      .build();

    expect(req).toEqual({
      type: 'evaluator',
      method: 'compare',
      params: {
        left: { type: 'stat', params: { key: Stat.warWeariness } },
        operator: 'lt',
        right: {
          type: 'population',
          params: { role: PopulationRole.Legion },
        },
      },
      message: 'War weariness must be lower than legions',
    });
  });
});
