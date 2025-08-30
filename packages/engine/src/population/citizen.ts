import { PopulationRole } from '../state';

export const citizen = {
  key: PopulationRole.Citizen,
  icon: '👤',
  label: 'Citizen',
  description:
    'Citizens are ordinary folk who fill your towns and farms. While they provide no special bonuses, they can be promoted into more specialized roles as your kingdom evolves.',
};
export type CitizenInfo = typeof citizen;
