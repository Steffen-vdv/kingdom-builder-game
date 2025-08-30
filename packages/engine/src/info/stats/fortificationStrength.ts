import { Stat } from '../../state';

export const fortificationStrength = {
  key: Stat.fortificationStrength,
  icon: '🛡️',
  label: 'Fortification Strength',
  description:
    'Fortification Strength represents your defenses. Fortifiers bolster these walls and improve their growth each development phase.',
} as const;
