import { BuildingId } from './buildingIds';
import { DevelopmentId } from './developments';
import { PopulationRole } from './populationRoles';

const ACTION_ID_MAP = {
	army_attack: 'army_attack',
	expand: 'expand',
	hold_festival: 'hold_festival',
	plow: 'plow',
	plunder: 'plunder',
	royal_decree: 'royal_decree',
	tax: 'tax',
	till: 'till',
	develop_farm: `develop:${DevelopmentId.Farm}`,
	develop_house: `develop:${DevelopmentId.House}`,
	develop_outpost: `develop:${DevelopmentId.Outpost}`,
	develop_watchtower: `develop:${DevelopmentId.Watchtower}`,
	develop_garden: `develop:${DevelopmentId.Garden}`,
	build_town_charter: `build:${BuildingId.TownCharter}`,
	build_mill: `build:${BuildingId.Mill}`,
	build_raiders_guild: `build:${BuildingId.RaidersGuild}`,
	build_plow_workshop: `build:${BuildingId.PlowWorkshop}`,
	build_market: `build:${BuildingId.Market}`,
	build_barracks: `build:${BuildingId.Barracks}`,
	build_citadel: `build:${BuildingId.Citadel}`,
	build_castle_walls: `build:${BuildingId.CastleWalls}`,
	build_castle_gardens: `build:${BuildingId.CastleGardens}`,
	build_temple: `build:${BuildingId.Temple}`,
	build_palace: `build:${BuildingId.Palace}`,
	build_great_hall: `build:${BuildingId.GreatHall}`,
	hire_council: `hire:${PopulationRole.Council}`,
	hire_legion: `hire:${PopulationRole.Legion}`,
	hire_fortifier: `hire:${PopulationRole.Fortifier}`,
} as const;

type ActionIdValue = (typeof ACTION_ID_MAP)[keyof typeof ACTION_ID_MAP];

const POPULATION_EVALUATION_ID_MAP = {
	tax: 'tax',
} as const;

const HIREABLE_POPULATION_ROLE_VALUES = [
	PopulationRole.Council,
	PopulationRole.Legion,
	PopulationRole.Fortifier,
] as const;

const DEVELOPMENT_ACTION_ID_ENTRIES = [
	[DevelopmentId.Farm, ACTION_ID_MAP.develop_farm],
	[DevelopmentId.House, ACTION_ID_MAP.develop_house],
	[DevelopmentId.Outpost, ACTION_ID_MAP.develop_outpost],
	[DevelopmentId.Watchtower, ACTION_ID_MAP.develop_watchtower],
	[DevelopmentId.Garden, ACTION_ID_MAP.develop_garden],
] as const;

const BUILDING_ACTION_ID_ENTRIES = [
	[BuildingId.TownCharter, ACTION_ID_MAP.build_town_charter],
	[BuildingId.Mill, ACTION_ID_MAP.build_mill],
	[BuildingId.RaidersGuild, ACTION_ID_MAP.build_raiders_guild],
	[BuildingId.PlowWorkshop, ACTION_ID_MAP.build_plow_workshop],
	[BuildingId.Market, ACTION_ID_MAP.build_market],
	[BuildingId.Barracks, ACTION_ID_MAP.build_barracks],
	[BuildingId.Citadel, ACTION_ID_MAP.build_citadel],
	[BuildingId.CastleWalls, ACTION_ID_MAP.build_castle_walls],
	[BuildingId.CastleGardens, ACTION_ID_MAP.build_castle_gardens],
	[BuildingId.Temple, ACTION_ID_MAP.build_temple],
	[BuildingId.Palace, ACTION_ID_MAP.build_palace],
	[BuildingId.GreatHall, ACTION_ID_MAP.build_great_hall],
] as const;

const HIRE_ACTION_ID_ENTRIES = [
	[PopulationRole.Council, ACTION_ID_MAP.hire_council],
	[PopulationRole.Legion, ACTION_ID_MAP.hire_legion],
	[PopulationRole.Fortifier, ACTION_ID_MAP.hire_fortifier],
] as const;

const DEVELOPMENT_ACTION_ID_BY_DEVELOPMENT = new Map(
	DEVELOPMENT_ACTION_ID_ENTRIES,
);
const DEVELOPMENT_ID_BY_ACTION = new Map<ActionIdValue, DevelopmentId>(
	DEVELOPMENT_ACTION_ID_ENTRIES.map(([developmentId, actionId]) => [
		actionId,
		developmentId,
	]),
);

const BUILDING_ACTION_ID_BY_BUILDING = new Map(BUILDING_ACTION_ID_ENTRIES);
const BUILDING_ID_BY_ACTION = new Map<ActionIdValue, BuildingId>(
	BUILDING_ACTION_ID_ENTRIES.map(([buildingId, actionId]) => [
		actionId,
		buildingId,
	]),
);

const HIRE_ACTION_ID_BY_ROLE = new Map(HIRE_ACTION_ID_ENTRIES);
const HIRE_ROLE_BY_ACTION = new Map<ActionIdValue, HireablePopulationRoleId>(
	HIRE_ACTION_ID_ENTRIES.map(([roleId, actionId]) => [actionId, roleId]),
);

export const ActionId = ACTION_ID_MAP;
export type ActionId = ActionIdValue;

export const PopulationEvaluationId = POPULATION_EVALUATION_ID_MAP;

type PopulationEvaluationIdMap = typeof POPULATION_EVALUATION_ID_MAP;

export type PopulationEvaluationId =
	PopulationEvaluationIdMap[keyof PopulationEvaluationIdMap];

export type DevelopmentActionId =
	(typeof DEVELOPMENT_ACTION_ID_ENTRIES)[number][1];

export type BuildingActionId = (typeof BUILDING_ACTION_ID_ENTRIES)[number][1];

export type HireActionId = (typeof HIRE_ACTION_ID_ENTRIES)[number][1];

export type HireablePopulationRoleId =
	(typeof HIREABLE_POPULATION_ROLE_VALUES)[number];

export const HIREABLE_POPULATION_ROLE_IDS = HIREABLE_POPULATION_ROLE_VALUES;

export const DEVELOPMENT_ACTION_IDS_BY_DEVELOPMENT =
	DEVELOPMENT_ACTION_ID_BY_DEVELOPMENT as ReadonlyMap<
		DevelopmentId,
		DevelopmentActionId
	>;

export const DEVELOPMENT_ACTION_IDS = Object.freeze(
	DEVELOPMENT_ACTION_ID_ENTRIES.map(([, actionId]) => actionId),
);

export const BUILDING_ACTION_IDS_BY_BUILDING =
	BUILDING_ACTION_ID_BY_BUILDING as ReadonlyMap<BuildingId, BuildingActionId>;

export const BUILDING_ACTION_IDS = Object.freeze(
	BUILDING_ACTION_ID_ENTRIES.map(([, actionId]) => actionId),
);

export const HIRE_ACTION_IDS_BY_ROLE = HIRE_ACTION_ID_BY_ROLE as ReadonlyMap<
	HireablePopulationRoleId,
	HireActionId
>;

export const HIRE_ACTION_IDS = Object.freeze(
	HIRE_ACTION_ID_ENTRIES.map(([, actionId]) => actionId),
);

export function actionIdForDevelopment(
	developmentId: DevelopmentId,
): DevelopmentActionId {
	const actionId = DEVELOPMENT_ACTION_ID_BY_DEVELOPMENT.get(developmentId);
	if (!actionId) {
		throw new Error(
			`Missing action id mapping for development "${developmentId}".`,
		);
	}
	return actionId;
}

export function developmentIdFromAction(
	actionId: ActionId,
): DevelopmentId | undefined {
	return DEVELOPMENT_ID_BY_ACTION.get(actionId);
}

export function actionIdForBuilding(buildingId: BuildingId): BuildingActionId {
	const actionId = BUILDING_ACTION_ID_BY_BUILDING.get(buildingId);
	if (!actionId) {
		throw new Error(`Missing action id mapping for building "${buildingId}".`);
	}
	return actionId;
}

export function buildingIdFromAction(
	actionId: ActionId,
): BuildingId | undefined {
	return BUILDING_ID_BY_ACTION.get(actionId);
}

export function actionIdForHireableRole(
	roleId: HireablePopulationRoleId,
): HireActionId {
	const actionId = HIRE_ACTION_ID_BY_ROLE.get(roleId);
	if (!actionId) {
		throw new Error(`Missing hire action id for role "${roleId}".`);
	}
	return actionId;
}

export function hireableRoleFromAction(
	actionId: ActionId,
): HireablePopulationRoleId | undefined {
	return HIRE_ROLE_BY_ACTION.get(actionId);
}
