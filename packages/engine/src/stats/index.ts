import type { StatKey } from '../state';
import { armyStrength } from './army_strength';
import { fortificationStrength } from './fortification_strength';
import { absorption } from './absorption';
import { maxPopulation } from './max_population';

export interface StatInfo {
  key: StatKey;
  icon: string;
  label: string;
  description: string;
}

export const STATS: Record<StatKey, StatInfo> = {
  [maxPopulation.key]: maxPopulation,
  [armyStrength.key]: armyStrength,
  [fortificationStrength.key]: fortificationStrength,
  [absorption.key]: absorption,
};

export { armyStrength, fortificationStrength, absorption, maxPopulation };
