import { maxPopulation } from './maxPopulation';
import { armyStrength } from './armyStrength';
import { fortificationStrength } from './fortificationStrength';
import { absorption } from './absorption';

export const statInfo = {
  [maxPopulation.key]: maxPopulation,
  [armyStrength.key]: armyStrength,
  [fortificationStrength.key]: fortificationStrength,
  [absorption.key]: absorption,
} as const;

export { maxPopulation, armyStrength, fortificationStrength, absorption };
