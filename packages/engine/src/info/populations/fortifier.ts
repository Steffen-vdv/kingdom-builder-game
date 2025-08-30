import { PopulationRole } from '../../state';

export const fortifier = {
  key: PopulationRole.Fortifier,
  icon: '🧱',
  label: 'Fortifier',
  description:
    'Fortifiers oversee your defenses. Each one adds a point of fortification strength and increases it by 25% every development phase, at the cost of ongoing gold upkeep.',
} as const;
