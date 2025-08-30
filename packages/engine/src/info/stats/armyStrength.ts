import { Stat } from '../../state';

export const armyStrength = {
  key: Stat.armyStrength,
  icon: '🗡️',
  label: 'Army Strength',
  description:
    'Army Strength reflects the offensive might of your forces. Commanders add flat strength and fuel growth during development.',
} as const;
