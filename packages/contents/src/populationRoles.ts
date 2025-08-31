import { populationRoleInfo } from './config/builders';

export const PopulationRole = {
  Council: 'council',
  Commander: 'commander',
  Fortifier: 'fortifier',
  Citizen: 'citizen',
} as const;
export type PopulationRoleId =
  (typeof PopulationRole)[keyof typeof PopulationRole];

export interface PopulationRoleInfo {
  key: PopulationRoleId;
  icon: string;
  label: string;
  description: string;
}

function createRoleMap() {
  const list: PopulationRoleInfo[] = [
    populationRoleInfo()
      .id(PopulationRole.Council)
      .icon('⚖️')
      .label('Council')
      .description(
        'The Council advises the crown and generates Action Points during the Development phase. Keeping them employed fuels your economy.',
      )
      .build(),
    populationRoleInfo()
      .id(PopulationRole.Commander)
      .icon('🎖️')
      .label('Commander')
      .description(
        'Commanders lead your forces, boosting Army Strength and training troops each Development phase.',
      )
      .build(),
    populationRoleInfo()
      .id(PopulationRole.Fortifier)
      .icon('🔧')
      .label('Fortifier')
      .description(
        'Fortifiers reinforce your defenses. They raise Fortification Strength and shore up the castle every Development phase.',
      )
      .build(),
    populationRoleInfo()
      .id(PopulationRole.Citizen)
      .icon('👤')
      .label('Citizen')
      .description(
        'Citizens are unassigned populace who await a role. They contribute little on their own but can be trained into specialists.',
      )
      .build(),
  ];
  return Object.fromEntries(list.map((r) => [r.key, r])) as Record<
    PopulationRoleId,
    PopulationRoleInfo
  >;
}

export const POPULATION_ROLES = createRoleMap();
