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
