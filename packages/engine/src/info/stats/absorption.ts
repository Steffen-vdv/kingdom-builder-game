import { Stat } from '../../state';

export const absorption = {
  key: Stat.absorption,
  icon: '🌀',
  label: 'Absorption',
  description:
    'Absorption reduces incoming damage by a percentage and can stack up to 100%. The reduction is applied after modifiers but before damage is taken.',
} as const;
