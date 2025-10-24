import { createEngine } from '../src/index.ts';
import {
	ACTIONS,
	BUILDINGS,
	DEVELOPMENTS,
	POPULATIONS,
	PHASES,
	GAME_START,
	RULES,
} from '@kingdom-builder/contents';
import {
	RESOURCE_V2_REGISTRY,
	RESOURCE_GROUP_V2_REGISTRY,
} from '@kingdom-builder/contents/registries/resourceV2';
import type {
	ActionConfig as ActionDef,
	BuildingConfig as BuildingDef,
	DevelopmentConfig as DevelopmentDef,
	PopulationConfig as PopulationDef,
	Registry,
	RuleSet,
	StartConfig,
} from '@kingdom-builder/protocol';
import type { PhaseDef } from '../src/phases.ts';

const BASE: {
	actions: Registry<ActionDef>;
	buildings: Registry<BuildingDef>;
	developments: Registry<DevelopmentDef>;
	populations: Registry<PopulationDef>;
	phases: PhaseDef[];
	start: StartConfig;
	resourceCatalogV2: {
		resources: typeof RESOURCE_V2_REGISTRY;
		groups: typeof RESOURCE_GROUP_V2_REGISTRY;
	};
} = {
	actions: ACTIONS,
	buildings: BUILDINGS,
	developments: DEVELOPMENTS,
	populations: POPULATIONS,
	phases: PHASES,
	start: GAME_START,
	resourceCatalogV2: {
		resources: RESOURCE_V2_REGISTRY,
		groups: RESOURCE_GROUP_V2_REGISTRY,
	},
};

type EngineOverrides = Partial<typeof BASE> & { rules?: RuleSet };

export function createTestEngine(overrides: EngineOverrides = {}) {
	const { rules, ...rest } = overrides;
	return createEngine({ ...BASE, ...rest, rules: rules ?? RULES });
}
