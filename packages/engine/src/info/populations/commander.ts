import { PopulationRole } from '../../state';

export const commander = {
  key: PopulationRole.Commander,
  icon: '🎖️',
  label: 'Army Commander',
  description:
    'Army Commanders lead your forces. They add one flat army strength and grow your army by 25% each development phase, though they require gold upkeep to remain in service.',
} as const;
