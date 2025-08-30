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

export const populationOverview = [
  'Population represents your citizens who can take on various roles:',
  `- ${council.icon} ${council.label}: ${council.description}`,
  `- ${commander.icon} ${commander.label}: ${commander.description}`,
  `- ${fortifier.icon} ${fortifier.label}: ${fortifier.description}`,
  `- ${citizen.icon} ${citizen.label}: ${citizen.description}`,
].join('\n');

export { council, commander, fortifier, citizen };
