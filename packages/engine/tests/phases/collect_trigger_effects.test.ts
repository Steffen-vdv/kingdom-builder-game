import { describe, it, expect } from 'vitest';
import {
  createEngine,
  collectTriggerEffects,
  runEffects,
  POPULATIONS,
  PopulationRole,
  DEVELOPMENTS,
  Resource,
} from '../../src';

const council = POPULATIONS.get(PopulationRole.Council);
const councilApGain = Number(
  council.onDevelopmentPhase?.find(
    (e) =>
      e.type === 'resource' &&
      e.method === 'add' &&
      e.params.key === Resource.ap,
  )?.params.amount ?? 0,
);

const farm = DEVELOPMENTS.get('farm');
const farmGoldGain = Number(
  farm.onDevelopmentPhase?.find(
    (e) =>
      e.type === 'resource' &&
      e.method === 'add' &&
      e.params.key === Resource.gold,
  )?.params.amount ?? 0,
);

describe('collectTriggerEffects', () => {
  it('lists individual effects for a trigger', () => {
    const ctx = createEngine();
    const player = ctx.game.players[0]!;
    const effects = collectTriggerEffects('onDevelopmentPhase', ctx, player);
    expect(effects.length).toBe(2);
    const apBefore = player.ap;
    const goldBefore = player.gold;
    for (const eff of effects) runEffects([eff], ctx);
    const councils = player.population[PopulationRole.Council];
    expect(player.ap).toBe(apBefore + councilApGain * councils);
    expect(player.gold).toBe(goldBefore + farmGoldGain);
  });
});
