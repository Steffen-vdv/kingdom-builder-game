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
import type { ResourceV2RuntimeCatalog } from '../src/resourcesV2/index.ts';

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

type EngineOverrides = Partial<typeof BASE> & {
	rules?: RuleSet;
	resourceV2Catalog?: ResourceV2RuntimeCatalog;
};

export function createTestEngine(overrides: EngineOverrides = {}) {
	const { rules, resourceV2Catalog, ...rest } = overrides;
	return createEngine({
		...BASE,
		...rest,
		rules: rules ?? RULES,
		resourceV2Catalog,
	});
}
