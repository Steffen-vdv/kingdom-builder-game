import { council } from './council';
import { commander } from './commander';
import { fortifier } from './fortifier';
import { citizen } from './citizen';

export const populationInfo = {
  [council.key]: council,
  [commander.key]: commander,
  [fortifier.key]: fortifier,
  [citizen.key]: citizen,
} as const;

export const populationOverview = {
  intro: 'Population represents your citizens who can take on various roles:',
  roles: [council, commander, fortifier, citizen],
} as const;

export { council, commander, fortifier, citizen };
