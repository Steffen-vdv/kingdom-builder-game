import { createEngine } from '../src/index.ts';
import {
	ACTIONS,
	BUILDINGS,
	DEVELOPMENTS,
	POPULATIONS,
	PHASES,
	RULES,
} from '@kingdom-builder/contents';
import {
	RESOURCE_V2_REGISTRY,
	RESOURCE_GROUP_V2_REGISTRY,
	RESOURCE_CATEGORY_V2_REGISTRY,
} from '@kingdom-builder/contents/registries/resourceV2';
import type {
	ActionConfig as ActionDef,
	BuildingConfig as BuildingDef,
	DevelopmentConfig as DevelopmentDef,
	PopulationConfig as PopulationDef,
	Registry,
	RuleSet,
} from '@kingdom-builder/protocol';
import type { PhaseDef } from '../src/phases.ts';

const BASE: {
	actions: Registry<ActionDef>;
	buildings: Registry<BuildingDef>;
	developments: Registry<DevelopmentDef>;
	populations: Registry<PopulationDef>;
	phases: PhaseDef[];
	resourceCatalogV2: {
		resources: typeof RESOURCE_V2_REGISTRY;
		groups: typeof RESOURCE_GROUP_V2_REGISTRY;
		categories: typeof RESOURCE_CATEGORY_V2_REGISTRY;
	};
} = {
	actions: ACTIONS,
	buildings: BUILDINGS,
	developments: DEVELOPMENTS,
	populations: POPULATIONS,
	phases: PHASES,
	resourceCatalogV2: {
		resources: RESOURCE_V2_REGISTRY,
		groups: RESOURCE_GROUP_V2_REGISTRY,
		categories: RESOURCE_CATEGORY_V2_REGISTRY,
	},
};

type EngineOverrides = Partial<typeof BASE> & {
	rules?: RuleSet;
	/**
	 * When true, skips initial setup for a clean slate.
	 * Defaults to false (runs setup like production).
	 */
	skipInitialSetup?: boolean;
};

/**
 * No-op system action IDs used when skipping initial setup.
 * These actions don't exist, so no setup effects run.
 */
const SKIP_SETUP_ACTION_IDS = {
	initialSetup: '__noop_initial_setup__',
	initialSetupDevmode: '__noop_initial_setup_devmode__',
	compensation: '__noop_compensation__',
	compensationDevmodeB: '__noop_compensation_devmode_b__',
};

export function createTestEngine(overrides: EngineOverrides = {}) {
	const { rules, skipInitialSetup = false, ...rest } = overrides;
	const options = {
		...BASE,
		...rest,
		rules: rules ?? RULES,
	};
	if (skipInitialSetup) {
		// Provide fake action IDs that don't exist, so no setup effects run
		(
			options as typeof options & {
				systemActionIds: typeof SKIP_SETUP_ACTION_IDS;
			}
		).systemActionIds = SKIP_SETUP_ACTION_IDS;
	}
	return createEngine(options);
}
