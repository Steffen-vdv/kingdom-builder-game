import { PopulationRole } from '../../state';

export const citizen = {
  key: PopulationRole.Citizen,
  icon: '👤',
  label: 'Citizen',
  description:
    'Citizens are unassigned populace with no special duties. They await roles in your kingdom to unlock their potential.',
} as const;
