import { Stat } from '../state';

export const armyStrength = {
  key: Stat.armyStrength,
  icon: '🗡️',
  label: 'Army Strength',
  description:
    'Army Strength measures the raw power of your forces. Many offensive actions scale with this value, and certain population roles or buildings can increase it to intimidate opponents.',
};
export type ArmyStrengthInfo = typeof armyStrength;
