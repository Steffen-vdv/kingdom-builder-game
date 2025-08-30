import { Stat } from '../state';

export const absorption = {
  key: Stat.absorption,
  icon: '🌀',
  label: 'Absorption',
  description:
    'Absorption is a special defensive stat that reduces a portion of incoming damage before it reaches your fortifications or castle. Investing in absorption can blunt enemy offensives.',
};
export type AbsorptionInfo = typeof absorption;
