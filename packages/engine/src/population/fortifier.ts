import { PopulationRole } from '../state';

export const fortifier = {
  key: PopulationRole.Fortifier,
  icon: '🧱',
  label: 'Fortifier',
  description:
    'Fortifiers focus on strengthening your defenses. They add to Fortification Strength and often grant unique bonuses that harden your borders against invasion.',
};
export type FortifierInfo = typeof fortifier;
