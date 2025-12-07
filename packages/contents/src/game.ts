import { startConfig, playerStart } from './config/builders';
import type { PlayerStartResourceBoundsInput } from './config/builders/startConfig/playerStartBuilder';
import { Resource, type ResourceKey, Stat, type StatKey, PopulationRole, type PopulationRoleId } from './internal';
import { DevelopmentId } from './developments';
import { RESOURCE_V2_REGISTRY } from './resourceV2';
import type { StartConfig } from '@kingdom-builder/protocol';

interface ResourceV2StartValues {
	readonly values: Record<string, number>;
	readonly lowerBounds: Record<string, number>;
	readonly upperBounds: Record<string, number>;
}

function buildResourceV2StartValues(resources?: Record<string, number>, stats?: Record<string, number>, population?: Record<string, number>): ResourceV2StartValues {
	const values: Record<string, number> = {};
	const lowerBounds: Record<string, number> = {};
	const upperBounds: Record<string, number> = {};

	function processMap(map: Record<string, number> | undefined) {
		if (!map) {
			return;
		}
		for (const [resourceId, value] of Object.entries(map)) {
			values[resourceId] = value;
			const definition = RESOURCE_V2_REGISTRY.byId[resourceId];
			if (definition) {
				if (typeof definition.lowerBound === 'number') {
					lowerBounds[resourceId] = definition.lowerBound;
				}
				if (typeof definition.upperBound === 'number') {
					upperBounds[resourceId] = definition.upperBound;
				}
			}
		}
	}

	processMap(resources);
	processMap(stats);
	processMap(population);

	return { values, lowerBounds, upperBounds };
}

function toResourceBoundsInput(values: ResourceV2StartValues): PlayerStartResourceBoundsInput | undefined {
	const hasLowerBounds = Object.keys(values.lowerBounds).length > 0;
	const hasUpperBounds = Object.keys(values.upperBounds).length > 0;
	if (!hasLowerBounds && !hasUpperBounds) {
		return undefined;
	}
	const bounds: PlayerStartResourceBoundsInput = {};
	if (hasLowerBounds) {
		bounds.lower = values.lowerBounds;
	}
	if (hasUpperBounds) {
		bounds.upper = values.upperBounds;
	}
	return bounds;
}

const PLAYER_START_RESOURCES = {
	[Resource.gold]: 10,
	[Resource.ap]: 0,
	[Resource.happiness]: 0,
	[Resource.castleHP]: 10,
} as const satisfies Record<ResourceKey, number>;

// Start stats exclude populationTotal - it's a derived/aggregate resource
const PLAYER_START_STATS = {
	[Stat.populationMax]: 1,
	[Stat.armyStrength]: 0,
	[Stat.fortificationStrength]: 0,
	[Stat.absorption]: 0,
	[Stat.growth]: 0.25,
	[Stat.warWeariness]: 0,
} as const satisfies Partial<Record<StatKey, number>>;

const PLAYER_START_POPULATION = {
	[PopulationRole.Council]: 1,
	[PopulationRole.Legion]: 0,
	[PopulationRole.Fortifier]: 0,
} as const satisfies Record<PopulationRoleId, number>;

const PLAYER_START_V2 = buildResourceV2StartValues(PLAYER_START_RESOURCES, PLAYER_START_STATS, PLAYER_START_POPULATION);

const DEV_MODE_PLAYER_RESOURCES = {
	[Resource.gold]: 100,
	[Resource.ap]: 0,
	[Resource.happiness]: 10,
	[Resource.castleHP]: 10,
} as const satisfies Record<ResourceKey, number>;

const DEV_MODE_PLAYER_POPULATION = {
	[PopulationRole.Council]: 2,
	[PopulationRole.Legion]: 1,
	[PopulationRole.Fortifier]: 1,
} as const satisfies Record<PopulationRoleId, number>;

const DEV_MODE_PLAYER_V2 = buildResourceV2StartValues(DEV_MODE_PLAYER_RESOURCES, undefined, DEV_MODE_PLAYER_POPULATION);

const DEV_MODE_PLAYER_OVERRIDE_B_RESOURCES = {
	[Resource.castleHP]: 1,
} as const satisfies Partial<Record<ResourceKey, number>>;

const DEV_MODE_PLAYER_OVERRIDE_B_V2 = buildResourceV2StartValues(DEV_MODE_PLAYER_OVERRIDE_B_RESOURCES);

const LAST_PLAYER_COMPENSATION_RESOURCES = {
	[Resource.ap]: 1,
} as const satisfies Partial<Record<ResourceKey, number>>;

const LAST_PLAYER_COMPENSATION_V2 = buildResourceV2StartValues(LAST_PLAYER_COMPENSATION_RESOURCES);

export const GAME_START: StartConfig = startConfig()
	.player(
		(() => {
			const bounds = toResourceBoundsInput(PLAYER_START_V2);
			let builder = playerStart().resources(PLAYER_START_RESOURCES).stats(PLAYER_START_STATS).population(PLAYER_START_POPULATION).valuesV2(PLAYER_START_V2.values);
			if (bounds) {
				builder = builder.resourceBoundsV2(bounds);
			}
			return builder.lands((lands) => {
				const developedLand = lands.land((land) => {
					return land.development(DevelopmentId.Farm);
				});
				return developedLand.land();
			});
		})(),
	)
	.lastPlayerCompensation((player) => {
		const bounds = toResourceBoundsInput(LAST_PLAYER_COMPENSATION_V2);
		let builder = player.resources(LAST_PLAYER_COMPENSATION_RESOURCES).valuesV2(LAST_PLAYER_COMPENSATION_V2.values);
		if (bounds) {
			builder = builder.resourceBoundsV2(bounds);
		}
		return builder;
	})
	.devMode((mode) =>
		mode
			.player((player) => {
				const bounds = toResourceBoundsInput(DEV_MODE_PLAYER_V2);
				let builder = player.resources(DEV_MODE_PLAYER_RESOURCES).population(DEV_MODE_PLAYER_POPULATION).valuesV2(DEV_MODE_PLAYER_V2.values);
				if (bounds) {
					builder = builder.resourceBoundsV2(bounds);
				}
				return builder;
			})
			.playerOverride('B', (player) => {
				const bounds = toResourceBoundsInput(DEV_MODE_PLAYER_OVERRIDE_B_V2);
				let builder = player.resources(DEV_MODE_PLAYER_OVERRIDE_B_RESOURCES).valuesV2(DEV_MODE_PLAYER_OVERRIDE_B_V2.values);
				if (bounds) {
					builder = builder.resourceBoundsV2(bounds);
				}
				return builder;
			}),
	)
	.build();
