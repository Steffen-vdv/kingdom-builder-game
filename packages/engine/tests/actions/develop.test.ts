import { describe, it, expect } from 'vitest';
import {
  createEngine,
  performAction,
  resolveAttack,
  runDevelopment,
} from '../../src/index.ts';

describe('Develop action', () => {
  it('places a Farm consuming one slot', () => {
    const ctx = createEngine();
    runDevelopment(ctx);
    const land = ctx.activePlayer.lands[1];
    performAction('develop', ctx, { id: 'farm', landId: land.id });
    expect(land.developments).toContain('farm');
    expect(land.slotsUsed).toBe(1);
  });

  it('places a House and increases max population', () => {
    const ctx = createEngine();
    runDevelopment(ctx);
    const land = ctx.activePlayer.lands[1];
    const maxBefore = ctx.activePlayer.maxPopulation;
    performAction('develop', ctx, { id: 'house', landId: land.id });
    expect(land.developments).toContain('house');
    expect(land.slotsUsed).toBe(1);
    expect(ctx.activePlayer.maxPopulation).toBe(maxBefore + 1);
  });

  it('places an Outpost granting army and fortification strength', () => {
    const ctx = createEngine();
    runDevelopment(ctx);
    const land = ctx.activePlayer.lands[1];
    const armyBefore = ctx.activePlayer.armyStrength;
    const fortBefore = ctx.activePlayer.fortificationStrength;
    performAction('develop', ctx, { id: 'outpost', landId: land.id });
    expect(land.developments).toContain('outpost');
    expect(land.slotsUsed).toBe(1);
    expect(ctx.activePlayer.armyStrength).toBe(armyBefore + 1);
    expect(ctx.activePlayer.fortificationStrength).toBe(fortBefore + 1);
  });

  it('handles Watchtower absorption and removal after attack', () => {
    const ctx = createEngine();
    runDevelopment(ctx);
    const land = ctx.activePlayer.lands[1];
    const fortBefore = ctx.activePlayer.fortificationStrength;
    performAction('develop', ctx, { id: 'watchtower', landId: land.id });
    expect(land.developments).toContain('watchtower');
    expect(land.slotsUsed).toBe(1);
    expect(ctx.activePlayer.fortificationStrength).toBe(fortBefore + 2);
    expect(ctx.activePlayer.absorption).toBeCloseTo(0.5, 5);

    resolveAttack(ctx.activePlayer, 0, ctx);
    expect(land.developments).not.toContain('watchtower');
    expect(land.slotsUsed).toBe(0);
    expect(ctx.activePlayer.absorption).toBeCloseTo(0, 5);
    expect(ctx.activePlayer.fortificationStrength).toBe(fortBefore + 2);
  });
});
