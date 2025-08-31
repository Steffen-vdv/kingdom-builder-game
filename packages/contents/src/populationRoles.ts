import type { PopulationRoleId } from '@kingdom-builder/engine/state';
import { PopulationRole } from '@kingdom-builder/engine/state';

export interface PopulationRoleInfo {
  key: PopulationRoleId;
  icon: string;
  label: string;
  description: string;
}

export const POPULATION_ROLES: Record<PopulationRoleId, PopulationRoleInfo> = {
  [PopulationRole.Council]: {
    key: PopulationRole.Council,
    icon: '⚖️',
    label: 'Council',
    description:
      'The Council advises the crown and generates Action Points during the Growth phase. Keeping them employed fuels your economy.',
  },
  [PopulationRole.Commander]: {
    key: PopulationRole.Commander,
    icon: '🎖️',
    label: 'Commander',
    description:
      'Commanders lead your forces, boosting Army Strength and training troops each Growth phase.',
  },
  [PopulationRole.Fortifier]: {
    key: PopulationRole.Fortifier,
    icon: '🔧',
    label: 'Fortifier',
    description:
      'Fortifiers reinforce your defenses. They raise Fortification Strength and shore up the castle every Growth phase.',
  },
  [PopulationRole.Citizen]: {
    key: PopulationRole.Citizen,
    icon: '👤',
    label: 'Citizen',
    description:
      'Citizens are unassigned populace who await a role. They contribute little on their own but can be trained into specialists.',
  },
};
