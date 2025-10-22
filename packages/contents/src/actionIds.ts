import { DevelopmentId } from './developments';
import type { DevelopmentId as DevelopmentIdValue } from './developments';
import { PopulationRole } from './populationRoles';
import type { PopulationRoleId } from './populationRoles';
import { BUILDING_IDS } from './buildingIds';

const POPULATION_ROLE_VALUES = [
	PopulationRole.Council,
	PopulationRole.Legion,
	PopulationRole.Fortifier,
] as const satisfies readonly PopulationRoleId[];

const DEVELOPMENT_IDS = [
	DevelopmentId.Farm,
	DevelopmentId.House,
	DevelopmentId.Outpost,
	DevelopmentId.Watchtower,
	DevelopmentId.Garden,
] as const satisfies readonly DevelopmentIdValue[];

const createPrefixedActionIdMap = <
	Prefix extends string,
	Ids extends readonly string[],
>(
	prefix: Prefix,
	ids: Ids,
) => {
	const result = {} as {
		[Key in Ids[number]]: `${Prefix}_${Key}`;
	};
	for (const id of ids) {
		result[id as Ids[number]] = `${prefix}_${id}` as `${Prefix}_${Ids[number]}`;
	}
	return result;
};

const createActionIdLookup = <Ids extends readonly string[]>(ids: Ids) => {
	const result = {} as { [Key in Ids[number]]: Key };
	for (const id of ids) {
		result[id as Ids[number]] = id;
	}
	return result;
};

const DEVELOPMENT_ACTION_ID_MAP = createPrefixedActionIdMap(
	'develop',
	DEVELOPMENT_IDS,
);

const BUILDING_ACTION_ID_MAP = createPrefixedActionIdMap('build', BUILDING_IDS);

const POPULATION_ACTION_ID_MAP = createPrefixedActionIdMap(
	'hire',
	POPULATION_ROLE_VALUES,
);

export type DevelopmentActionIdMap = typeof DEVELOPMENT_ACTION_ID_MAP;
export type DevelopmentActionId =
	DevelopmentActionIdMap[keyof DevelopmentActionIdMap];

export type BuildingActionIdMap = typeof BUILDING_ACTION_ID_MAP;
export type BuildingActionId = BuildingActionIdMap[keyof BuildingActionIdMap];

export type PopulationActionIdMap = typeof POPULATION_ACTION_ID_MAP;
export type PopulationActionId =
	PopulationActionIdMap[keyof PopulationActionIdMap];

export const DEVELOPMENT_ACTION_IDS = Object.values(
	DEVELOPMENT_ACTION_ID_MAP,
) as readonly DevelopmentActionId[];

export const BUILDING_ACTION_IDS = Object.values(
	BUILDING_ACTION_ID_MAP,
) as readonly BuildingActionId[];

export const POPULATION_ACTION_IDS = Object.values(
	POPULATION_ACTION_ID_MAP,
) as readonly PopulationActionId[];

export const DEVELOPMENT_ACTION_ID_BY_DEVELOPMENT_ID =
	DEVELOPMENT_ACTION_ID_MAP;

export const BUILDING_ACTION_ID_BY_BUILDING_ID = BUILDING_ACTION_ID_MAP;

export const POPULATION_ACTION_ID_BY_ROLE = POPULATION_ACTION_ID_MAP;

const BASE_ACTION_ID_MAP = {
	army_attack: 'army_attack',
	expand: 'expand',
	hold_festival: 'hold_festival',
	plow: 'plow',
	plunder: 'plunder',
	royal_decree: 'royal_decree',
	tax: 'tax',
	till: 'till',
} as const;

const ACTION_ID_MAP = {
	...BASE_ACTION_ID_MAP,
	...createActionIdLookup(DEVELOPMENT_ACTION_IDS),
	...createActionIdLookup(BUILDING_ACTION_IDS),
	...createActionIdLookup(POPULATION_ACTION_IDS),
} as const;

const LEGACY_COMPOSITE_ACTION_ID_MAP = {
	build: 'build',
	develop: 'develop',
	raise_pop: 'raise_pop',
} as const;

const POPULATION_EVALUATION_ID_MAP = {
	tax: 'tax',
} as const;

export const ActionId = {
	...ACTION_ID_MAP,
	...LEGACY_COMPOSITE_ACTION_ID_MAP,
} as const;

export type ActionId = (typeof ActionId)[keyof typeof ActionId];

export const PopulationEvaluationId = POPULATION_EVALUATION_ID_MAP;

type PopulationEvaluationIdMap = typeof POPULATION_EVALUATION_ID_MAP;

export type PopulationEvaluationId =
	PopulationEvaluationIdMap[keyof PopulationEvaluationIdMap];
