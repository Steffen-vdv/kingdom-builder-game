import type { StatKey } from '@kingdom-builder/engine/state';
import { Stat } from '@kingdom-builder/engine/state';

export interface StatInfo {
  key: StatKey;
  icon: string;
  label: string;
  description: string;
}

export const STATS: Record<StatKey, StatInfo> = {
  [Stat.maxPopulation]: {
    key: Stat.maxPopulation,
    icon: '👥',
    label: 'Max Population',
    description:
      'Max Population determines how many subjects your kingdom can sustain. Expand infrastructure or build houses to increase it.',
  },
  [Stat.armyStrength]: {
    key: Stat.armyStrength,
    icon: '🛡️',
    label: 'Army Strength',
    description:
      'Army Strength reflects the overall power of your military forces. A higher value makes your attacks more formidable.',
  },
  [Stat.fortificationStrength]: {
    key: Stat.fortificationStrength,
    icon: '🏯',
    label: 'Fortification Strength',
    description:
      'Fortification Strength measures the resilience of your defenses. It reduces damage taken when enemies assault your castle.',
  },
  [Stat.absorption]: {
    key: Stat.absorption,
    icon: '🌀',
    label: 'Absorption',
    description:
      'Absorption reduces incoming damage by a percentage. It represents magical barriers or tactical advantages that soften blows.',
  },
};
