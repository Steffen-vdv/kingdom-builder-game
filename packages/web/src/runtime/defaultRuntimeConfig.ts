import {
	BuildingId,
	GAME_START,
	PHASES,
	PRIMARY_ICON_ID,
	PopulationRole,
	Resource,
	RULES,
} from '@kingdom-builder/contents';
import type { RuntimeConfig, EngineBootstrapOptions } from './types';

const DEFAULT_DEVELOPER_RESOURCES: Record<string, number> = Object.freeze({
	[Resource.gold]: 100,
	[Resource.happiness]: 10,
});

const DEFAULT_DEVELOPER_POPULATION: Record<string, number> = Object.freeze({
	[PopulationRole.Council]: 2,
	[PopulationRole.Legion]: 1,
	[PopulationRole.Fortifier]: 1,
});

export const DEFAULT_RUNTIME_CONFIG: RuntimeConfig = Object.freeze({
	primaryIcon: {
		resourceKey: PRIMARY_ICON_ID,
	},
	developerPreset: {
		resourceTargets: DEFAULT_DEVELOPER_RESOURCES,
		population: DEFAULT_DEVELOPER_POPULATION,
		buildingIds: [BuildingId.Mill],
		landCount: 5,
		skipIfBuildingPresent: BuildingId.Mill,
	},
});

export const DEFAULT_ENGINE_BOOTSTRAP: EngineBootstrapOptions = Object.freeze({
	phases: PHASES,
	start: GAME_START,
	rules: RULES,
});
