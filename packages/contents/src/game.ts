import { startConfig, playerStart } from './config/builders';
import type { PlayerStartResourceBoundsInput } from './config/builders/startConfig/playerStartBuilder';
import { Resource, type ResourceKey } from './resources';
import { Stat, type StatKey } from './stats';
import { PopulationRole, type PopulationRoleId } from './populationRoles';
import { DevelopmentId } from './developments';
import { RESOURCE_V2_REGISTRY } from './resourceV2';
import type { StartConfig } from '@kingdom-builder/protocol';

const RESOURCE_V2_ID_BY_RESOURCE_KEY = {
	[Resource.gold]: 'resource:core:gold',
	[Resource.ap]: 'resource:core:action-points',
	[Resource.happiness]: 'resource:core:happiness',
	[Resource.castleHP]: 'resource:core:castle-hp',
} as const satisfies Record<ResourceKey, string>;

const RESOURCE_V2_ID_BY_STAT_KEY = {
	[Stat.maxPopulation]: 'resource:stat:max-population',
	[Stat.armyStrength]: 'resource:stat:army-strength',
	[Stat.fortificationStrength]: 'resource:stat:fortification-strength',
	[Stat.absorption]: 'resource:stat:absorption',
	[Stat.growth]: 'resource:stat:growth',
	[Stat.warWeariness]: 'resource:stat:war-weariness',
} as const satisfies Record<StatKey, string>;

const RESOURCE_V2_ID_BY_POPULATION_ROLE = {
	[PopulationRole.Council]: 'resource:population:role:council',
	[PopulationRole.Legion]: 'resource:population:role:legion',
	[PopulationRole.Fortifier]: 'resource:population:role:fortifier',
} as const satisfies Record<PopulationRoleId, string>;

interface LegacyStartValues {
	readonly resources?: Record<string, number>;
	readonly stats?: Record<string, number>;
	readonly population?: Record<string, number>;
}

interface ResourceV2StartValues {
	readonly values: Record<string, number>;
	readonly lowerBounds: Record<string, number>;
	readonly upperBounds: Record<string, number>;
	readonly mismatches: string[];
}

function buildResourceV2StartValues(legacy: LegacyStartValues): ResourceV2StartValues {
	const values: Record<string, number> = {};
	const lowerBounds: Record<string, number> = {};
	const upperBounds: Record<string, number> = {};
	const mismatches: string[] = [];

	function mirror<K extends string>(legacyMap: Record<K, number> | undefined, idMap: Record<K, string>, scope: string) {
		if (!legacyMap) {
			return;
		}
		for (const [legacyKey, value] of Object.entries(legacyMap) as Array<[K, number]>) {
			const resourceId = idMap[legacyKey];
			if (!resourceId) {
				mismatches.push(`${scope}:${legacyKey} missing ResourceV2 id`);
				continue;
			}
			const definition = RESOURCE_V2_REGISTRY.byId[resourceId];
			if (!definition) {
				mismatches.push(`${scope}:${legacyKey} missing catalog entry for ${resourceId}`);
				continue;
			}
			if (values[resourceId] !== undefined && values[resourceId] !== value) {
				mismatches.push(`${scope}:${legacyKey} value ${value} mismatches ResourceV2 value ${values[resourceId]} for ${resourceId}`);
				continue;
			}
			values[resourceId] = value;
			if (typeof definition.lowerBound === 'number') {
				lowerBounds[resourceId] = definition.lowerBound;
			}
			if (typeof definition.upperBound === 'number') {
				upperBounds[resourceId] = definition.upperBound;
			}
		}
	}

	mirror(legacy.resources as Record<ResourceKey, number> | undefined, RESOURCE_V2_ID_BY_RESOURCE_KEY, 'resource');
	mirror(legacy.stats as Record<StatKey, number> | undefined, RESOURCE_V2_ID_BY_STAT_KEY, 'stat');
	mirror(legacy.population as Record<PopulationRoleId, number> | undefined, RESOURCE_V2_ID_BY_POPULATION_ROLE, 'population');

	return { values, lowerBounds, upperBounds, mismatches };
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

function assertNoResourceV2Mismatches(context: string, mismatches: string[]) {
	if (mismatches.length > 0) {
		throw new Error(`${context} ResourceV2 mismatches: ${mismatches.join('; ')}`);
	}
}

const PLAYER_START_RESOURCES = {
	[Resource.gold]: 10,
	[Resource.ap]: 0,
	[Resource.happiness]: 0,
	[Resource.castleHP]: 10,
} as const satisfies Record<ResourceKey, number>;

const PLAYER_START_STATS = {
	[Stat.maxPopulation]: 1,
	[Stat.armyStrength]: 0,
	[Stat.fortificationStrength]: 0,
	[Stat.absorption]: 0,
	[Stat.growth]: 0.25,
	[Stat.warWeariness]: 0,
} as const satisfies Record<StatKey, number>;

const PLAYER_START_POPULATION = {
	[PopulationRole.Council]: 1,
	[PopulationRole.Legion]: 0,
	[PopulationRole.Fortifier]: 0,
} as const satisfies Record<PopulationRoleId, number>;

const PLAYER_START_V2 = buildResourceV2StartValues({
	resources: PLAYER_START_RESOURCES,
	stats: PLAYER_START_STATS,
	population: PLAYER_START_POPULATION,
});
assertNoResourceV2Mismatches('Base player start', PLAYER_START_V2.mismatches);

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

const DEV_MODE_PLAYER_V2 = buildResourceV2StartValues({
	resources: DEV_MODE_PLAYER_RESOURCES,
	population: DEV_MODE_PLAYER_POPULATION,
});
assertNoResourceV2Mismatches('Dev mode player start', DEV_MODE_PLAYER_V2.mismatches);

const DEV_MODE_PLAYER_OVERRIDE_B_RESOURCES = {
	[Resource.castleHP]: 1,
} as const satisfies Partial<Record<ResourceKey, number>>;

const DEV_MODE_PLAYER_OVERRIDE_B_V2 = buildResourceV2StartValues({
	resources: DEV_MODE_PLAYER_OVERRIDE_B_RESOURCES,
});
assertNoResourceV2Mismatches('Dev mode player override B', DEV_MODE_PLAYER_OVERRIDE_B_V2.mismatches);

const LAST_PLAYER_COMPENSATION_RESOURCES = {
	[Resource.ap]: 1,
} as const satisfies Partial<Record<ResourceKey, number>>;

const LAST_PLAYER_COMPENSATION_V2 = buildResourceV2StartValues({
	resources: LAST_PLAYER_COMPENSATION_RESOURCES,
});
assertNoResourceV2Mismatches('Last player compensation', LAST_PLAYER_COMPENSATION_V2.mismatches);

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
