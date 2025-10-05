import { Registry, buildingSchema } from '@kingdom-builder/protocol';
import type { BuildingDef } from './defs';
import { registerBuildings } from './buildings/registerBuildings';

export type { BuildingDef } from './defs';

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
export type BuildingIds = typeof BuildingId;

export function createBuildingRegistry() {
	const registry = new Registry<BuildingDef>(buildingSchema.passthrough());

	registerBuildings(registry, BuildingId);

	return registry;
}

export const BUILDINGS = createBuildingRegistry();
