import { describe, it, expect } from 'vitest';
import { performAction, getActionRequirements, advance } from '../../src';
import { PopulationRole } from '../../src/state';
import { createTestEngine } from '../helpers.ts';

describe('Army Attack action', () => {
  it('blocks when war weariness is not lower than commanders', () => {
    const ctx = createTestEngine();
    ctx.activePlayer.population[PopulationRole.Commander] = 1;
    ctx.activePlayer.warWeariness = 1;
    while (ctx.game.currentPhase !== 'main') advance(ctx);
    const failures = getActionRequirements('army_attack', ctx);
    expect(failures).toHaveLength(1);
    expect(() => performAction('army_attack', ctx)).toThrow();
  });

  it('allows attack when war weariness is lower than commanders', () => {
    const ctx = createTestEngine();
    ctx.activePlayer.population[PopulationRole.Commander] = 2;
    ctx.activePlayer.warWeariness = 1;
    while (ctx.game.currentPhase !== 'main') advance(ctx);
    const failures = getActionRequirements('army_attack', ctx);
    expect(failures).toHaveLength(0);
    expect(() => performAction('army_attack', ctx)).not.toThrow();
  });
});
