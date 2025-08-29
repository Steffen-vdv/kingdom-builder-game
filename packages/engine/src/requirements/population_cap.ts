import type { RequirementHandler } from './index';

export const populationCap: RequirementHandler = (req, ctx) => {
  const current = Object.values(ctx.activePlayer.population).reduce(
    (a, b) => a + b,
    0,
  );
  return current < ctx.activePlayer.maxPopulation
    ? true
    : req.message || 'Free space for 👥';
};
