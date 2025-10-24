import { createEngine } from '../src/index.ts';
import {
	ACTIONS,
	BUILDINGS,
	DEVELOPMENTS,
	POPULATIONS,
	PHASES,
	GAME_START,
	RULES,
	buildResourceCatalogV2,
} from '@kingdom-builder/contents';
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
} = {
	actions: ACTIONS,
	buildings: BUILDINGS,
	developments: DEVELOPMENTS,
	populations: POPULATIONS,
	phases: PHASES,
	start: GAME_START,
};

const BASE_RESOURCE_CATALOG_V2 = buildResourceCatalogV2();

type EngineOverrides = Partial<typeof BASE> & {
	rules?: RuleSet;
	resourceCatalogV2?: typeof BASE_RESOURCE_CATALOG_V2;
};

export function createTestEngine(overrides: EngineOverrides = {}) {
	const { rules, resourceCatalogV2, ...rest } = overrides;
	return createEngine({
		...BASE,
		...rest,
		rules: rules ?? RULES,
		resourceCatalogV2: resourceCatalogV2 ?? BASE_RESOURCE_CATALOG_V2,
	});
}
