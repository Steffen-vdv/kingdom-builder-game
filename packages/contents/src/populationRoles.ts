import {
	populationRole,
	type PopulationRoleInfo,
	toRecord,
} from './config/builders';

export const PopulationRole = {
	Council: 'council',
	Legion: 'legion',
	Fortifier: 'fortifier',
	Citizen: 'citizen',
} as const;
export type PopulationRoleId =
	(typeof PopulationRole)[keyof typeof PopulationRole];

const defs: PopulationRoleInfo[] = [
	populationRole(PopulationRole.Council)
		.icon('⚖️')
		.label('Council')
		.description(
			'The Council advises the crown and generates Action Points during the Growth phase. Keeping them employed fuels your economy.',
		)
		.build(),
	populationRole(PopulationRole.Legion)
		.icon('🎖️')
		.label('Legion')
		.description(
			'Legions lead your forces, boosting Army Strength and training troops each Growth phase.',
		)
		.build(),
	populationRole(PopulationRole.Fortifier)
		.icon('🔧')
		.label('Fortifier')
		.description(
			'Fortifiers reinforce your defenses. They raise Fortification Strength and shore up the castle every Growth phase.',
		)
		.build(),
	populationRole(PopulationRole.Citizen)
		.icon('👤')
		.label('Citizen')
		.description(
			'Citizens are unassigned populace who await a role. They contribute little on their own but can be trained into specialists.',
		)
		.build(),
];

export const POPULATION_ROLES: Record<PopulationRoleId, PopulationRoleInfo> =
	toRecord(defs) as Record<PopulationRoleId, PopulationRoleInfo>;
