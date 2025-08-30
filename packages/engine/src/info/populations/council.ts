import { PopulationRole } from '../../state';

export const council = {
  key: PopulationRole.Council,
  icon: '⚖️',
  label: 'Council',
  description:
    'Councils handle the realm\u2019s administration. Each member produces one action point during development but expects 2 gold during upkeep to keep the bureaucracy running.',
} as const;
