export const PopulationRole = {
	Council: 'resource:core:council',
	Legion: 'resource:core:legion',
	Fortifier: 'resource:core:fortifier',
} as const;

export type PopulationRoleId = (typeof PopulationRole)[keyof typeof PopulationRole];
export type PopulationRoleId = PopulationRoleId;
