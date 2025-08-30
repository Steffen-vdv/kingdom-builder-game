import type { RequirementHandler } from './index';

export const buildingExists: RequirementHandler = (req, ctx) => {
  const id = req.params?.['id'];
  if (typeof id !== 'string') throw new Error('building:exists requires id');
  return (
    ctx.activePlayer.buildings.has(id) ||
    req.message ||
    `Requires building ${id}`
  );
};
