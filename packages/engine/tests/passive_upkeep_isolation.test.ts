import { describe, it, expect } from 'vitest';
import { createTestEngine } from './helpers.ts';
import {
  runEffects,
  collectTriggerEffects,
  advance,
  Resource,
} from '../src/index.ts';

describe('passive upkeep isolation', () => {
  it('only triggers for owning player', () => {
    const ctx = createTestEngine();
    runEffects(
      [
        {
          type: 'passive',
          method: 'add',
          params: {
            id: 'temp_upkeep',
            onUpkeepPhase: [
              {
                type: 'resource',
                method: 'remove',
                params: { key: Resource.gold, amount: 2 },
              },
            ],
          },
        },
      ],
      ctx,
    );
    while (
      !(
        ctx.game.currentPlayerIndex === 1 &&
        ctx.game.currentPhase === 'upkeep' &&
        ctx.game.currentStep === 'resolve-dynamic-triggers'
      )
    ) {
      advance(ctx);
    }
    expect(collectTriggerEffects('onUpkeepPhase', ctx)).toHaveLength(0);
    while (
      !(
        ctx.game.turn === 2 &&
        ctx.game.currentPlayerIndex === 0 &&
        ctx.game.currentPhase === 'upkeep' &&
        ctx.game.currentStep === 'resolve-dynamic-triggers'
      )
    ) {
      advance(ctx);
    }
    const effects = collectTriggerEffects('onUpkeepPhase', ctx);
    expect(effects).toHaveLength(1);
    expect(effects[0]?.params).toMatchObject({ key: Resource.gold, amount: 2 });
  });
});
