import { DevelopmentId } from './developments';
import { BuildingId } from './buildingIds';
import { PopulationRole } from './populationRoles';
import type { PopulationRoleId } from './populationRoles';

type ValueOf<T> = T[keyof T];

export const BasicActionId = {
	army_attack: 'army_attack',
	expand: 'expand',
	hold_festival: 'hold_festival',
	plow: 'plow',
	plunder: 'plunder',
	royal_decree: 'royal_decree',
	tax: 'tax',
	till: 'till',
} as const;

export type BasicActionId = ValueOf<typeof BasicActionId>;

export const DevelopActionId = {
	develop_farm: 'develop_farm',
	develop_house: 'develop_house',
	develop_outpost: 'develop_outpost',
	develop_watchtower: 'develop_watchtower',
} as const;

export type DevelopmentActionId = ValueOf<typeof DevelopActionId>;

export const HireActionId = {
	hire_council: 'hire_council',
	hire_legion: 'hire_legion',
	hire_fortifier: 'hire_fortifier',
} as const;

export type PopulationActionId = ValueOf<typeof HireActionId>;

export const BuildActionId = {
	build_town_charter: 'build_town_charter',
	build_mill: 'build_mill',
	build_raiders_guild: 'build_raiders_guild',
	build_plow_workshop: 'build_plow_workshop',
	build_market: 'build_market',
	build_barracks: 'build_barracks',
	build_citadel: 'build_citadel',
	build_castle_walls: 'build_castle_walls',
	build_castle_gardens: 'build_castle_gardens',
	build_temple: 'build_temple',
	build_palace: 'build_palace',
	build_great_hall: 'build_great_hall',
} as const;

export type BuildingActionId = ValueOf<typeof BuildActionId>;

export const DEVELOPMENT_ACTION_IDS: readonly DevelopmentActionId[] = [
	DevelopActionId.develop_house,
	DevelopActionId.develop_farm,
	DevelopActionId.develop_outpost,
	DevelopActionId.develop_watchtower,
];

export const BUILDING_ACTION_IDS: readonly BuildingActionId[] = [
	BuildActionId.build_town_charter,
	BuildActionId.build_mill,
	BuildActionId.build_raiders_guild,
	BuildActionId.build_plow_workshop,
	BuildActionId.build_market,
	BuildActionId.build_barracks,
	BuildActionId.build_citadel,
	BuildActionId.build_castle_walls,
	BuildActionId.build_castle_gardens,
	BuildActionId.build_temple,
	BuildActionId.build_palace,
	BuildActionId.build_great_hall,
];

export const POPULATION_ACTION_IDS: readonly PopulationActionId[] = [HireActionId.hire_council, HireActionId.hire_legion, HireActionId.hire_fortifier];

export const ActionId = {
	...BasicActionId,
	...DevelopActionId,
	...HireActionId,
	...BuildActionId,
} as const;

export type ActionId = ValueOf<typeof ActionId>;

export const PopulationEvaluationId = {
	tax: 'tax',
} as const;

export type PopulationEvaluationId = ValueOf<typeof PopulationEvaluationId>;

export const DEVELOPMENT_ACTION_DEVELOPMENT_MAP = {
	[DevelopActionId.develop_house]: DevelopmentId.House,
	[DevelopActionId.develop_farm]: DevelopmentId.Farm,
	[DevelopActionId.develop_outpost]: DevelopmentId.Outpost,
	[DevelopActionId.develop_watchtower]: DevelopmentId.Watchtower,
} as const satisfies Record<DevelopmentActionId, DevelopmentId>;

export const BUILD_ACTION_BUILDING_MAP = {
	[BuildActionId.build_town_charter]: BuildingId.TownCharter,
	[BuildActionId.build_mill]: BuildingId.Mill,
	[BuildActionId.build_raiders_guild]: BuildingId.RaidersGuild,
	[BuildActionId.build_plow_workshop]: BuildingId.PlowWorkshop,
	[BuildActionId.build_market]: BuildingId.Market,
	[BuildActionId.build_barracks]: BuildingId.Barracks,
	[BuildActionId.build_citadel]: BuildingId.Citadel,
	[BuildActionId.build_castle_walls]: BuildingId.CastleWalls,
	[BuildActionId.build_castle_gardens]: BuildingId.CastleGardens,
	[BuildActionId.build_temple]: BuildingId.Temple,
	[BuildActionId.build_palace]: BuildingId.Palace,
	[BuildActionId.build_great_hall]: BuildingId.GreatHall,
} as const satisfies Record<BuildingActionId, BuildingId>;

export const HIRE_ACTION_ROLE_MAP = {
	[HireActionId.hire_council]: PopulationRole.Council,
	[HireActionId.hire_legion]: PopulationRole.Legion,
	[HireActionId.hire_fortifier]: PopulationRole.Fortifier,
} as const satisfies Record<PopulationActionId, PopulationRoleId>;
