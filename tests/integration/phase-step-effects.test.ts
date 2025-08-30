import { describe, it, expect } from 'vitest';
import {
  createEngine,
  startTurn,
  runCurrentStep,
  Resource,
} from '../../packages/engine/src';

describe('Phase step effects', () => {
  it('resolves step-based triggers for development and upkeep', () => {
    const ctx = createEngine();
    startTurn(ctx, 0);
    const player = ctx.activePlayer;

    expect(player.resources[Resource.gold]).toBe(10);
    expect(player.resources[Resource.ap]).toBe(0);

    // Development: Step 1 - Income (farm grants 2 gold)
    runCurrentStep(ctx);
    expect(player.resources[Resource.gold]).toBe(12);

    // Development: Step 2 - Generate AP (council grants 1 AP)
    runCurrentStep(ctx);
    expect(player.resources[Resource.ap]).toBe(1);

    // Development: Step 3 - no effects
    runCurrentStep(ctx);

    // Upkeep: Step 1 - Pay upkeep (council costs 2 gold)
    runCurrentStep(ctx);
    expect(player.resources[Resource.gold]).toBe(10);
  });
});
