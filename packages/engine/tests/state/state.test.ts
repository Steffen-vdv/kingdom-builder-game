import { describe, it, expect } from 'vitest';
import { Land, PlayerState, GameState, Stat } from '../../src/state/index.ts';

describe('State classes', () => {
  it('calculates free slots on land', () => {
    const land = new Land('l1', 2, true);
    expect(land.slotsFree).toBe(2);
    land.slotsUsed = 1;
    expect(land.slotsFree).toBe(1);
  });

  it('updates resources and stats via getters and setters', () => {
    const player = new PlayerState('A', 'Alice');
    player.gold = 5;
    player.maxPopulation = 3;
    expect(player.gold).toBe(5);
    expect(player.maxPopulation).toBe(3);
  });

  it('tracks stat history when values become non-zero', () => {
    const player = new PlayerState('A', 'Alice');
    expect(player.statsHistory[Stat.armyStrength]).toBe(false);
    player.armyStrength = 1;
    expect(player.statsHistory[Stat.armyStrength]).toBe(true);
    player.armyStrength = 0;
    expect(player.statsHistory[Stat.armyStrength]).toBe(true);
  });

  it('provides active and opponent players', () => {
    const game = new GameState('Alice', 'Bob');
    expect(game.active.id).toBe('A');
    expect(game.opponent.id).toBe('B');
    game.currentPlayerIndex = 1;
    expect(game.active.id).toBe('B');
    expect(game.opponent.id).toBe('A');
  });
});
