export const BUILDING_ID_VALUES = [
	'town_charter',
	'mill',
	'raiders_guild',
	'plow_workshop',
	'market',
	'barracks',
	'citadel',
	'castle_walls',
	'castle_gardens',
	'temple',
	'palace',
	'great_hall',
] as const;

export const BuildingId = {
	TownCharter: 'town_charter',
	Mill: 'mill',
	RaidersGuild: 'raiders_guild',
	PlowWorkshop: 'plow_workshop',
	Market: 'market',
	Barracks: 'barracks',
	Citadel: 'citadel',
	CastleWalls: 'castle_walls',
	CastleGardens: 'castle_gardens',
	Temple: 'temple',
	Palace: 'palace',
	GreatHall: 'great_hall',
} as const;

export type BuildingId = (typeof BuildingId)[keyof typeof BuildingId];

export type BuildingIdValue = (typeof BUILDING_ID_VALUES)[number];

export const BUILDING_IDS = BUILDING_ID_VALUES;
