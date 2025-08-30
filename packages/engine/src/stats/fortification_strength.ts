import { Stat } from '../state';

export const fortificationStrength = {
  key: Stat.fortificationStrength,
  icon: '🛡️',
  label: 'Fortification Strength',
  description:
    'Fortification Strength reflects the defensive preparations around your castle and lands. Higher values absorb more damage from attacks and help your kingdom withstand sieges.',
};
export type FortificationStrengthInfo = typeof fortificationStrength;
