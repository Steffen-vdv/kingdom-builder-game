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

export const populationOverview =
  'Population represents your citizens who can take on various roles. Councils generate action points, Commanders and Fortifiers empower your military, and unassigned Citizens provide no benefit until allocated.';

export { council, commander, fortifier, citizen };
