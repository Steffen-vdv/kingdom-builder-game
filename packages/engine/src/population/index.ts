import type { PopulationRoleId } from '../state';
import { council } from './council';
import { commander } from './commander';
import { fortifier } from './fortifier';
import { citizen } from './citizen';

export interface PopulationRoleInfo {
  key: PopulationRoleId;
  icon: string;
  label: string;
  description: string;
}

export const POPULATION_ROLES: Record<PopulationRoleId, PopulationRoleInfo> = {
  [council.key]: council,
  [commander.key]: commander,
  [fortifier.key]: fortifier,
  [citizen.key]: citizen,
};

export { council, commander, fortifier, citizen };
