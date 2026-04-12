import { createEngine } from '../src/index.ts';
import {
	ACTIONS,
	ACTION_META_CATEGORIES,
	BUILDINGS,
	DEVELOPMENTS,
	PHASES,
	RULES,
	RESOURCE_REGISTRY,
	RESOURCE_GROUP_REGISTRY,
	RESOURCE_CATEGORY_REGISTRY,
} from '@boardsmith/contents';
import {
	Registry,
	actionSchema,
	type ActionConfig as ActionDef,
	type BuildingConfig as BuildingDef,
	type DevelopmentConfig as DevelopmentDef,
	type RuleSet,
} from '@boardsmith/protocol';
import type { PhaseDef } from '../src/phases.ts';

const BASE: {
	actions: Registry<ActionDef>;
	actionMetaCategories: typeof ACTION_META_CATEGORIES;
	buildings: Registry<BuildingDef>;
	developments: Registry<DevelopmentDef>;
	phases: PhaseDef[];
	resourceCatalog: {
		resources: typeof RESOURCE_REGISTRY;
		groups: typeof RESOURCE_GROUP_REGISTRY;
		categories: typeof RESOURCE_CATEGORY_REGISTRY;
	};
} = {
	actions: ACTIONS,
	actionMetaCategories: ACTION_META_CATEGORIES,
	buildings: BUILDINGS,
	developments: DEVELOPMENTS,
	phases: PHASES,
	resourceCatalog: {
		resources: RESOURCE_REGISTRY,
		groups: RESOURCE_GROUP_REGISTRY,
		categories: RESOURCE_CATEGORY_REGISTRY,
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
 * Creates a copy of the actions registry without system roles.
 * This causes the engine to skip initial setup and compensation.
 */
function createActionsWithoutSystemRoles(
	sourceActions: Registry<ActionDef>,
): Registry<ActionDef> {
	const registry = new Registry<ActionDef>(actionSchema);
	for (const [id, action] of sourceActions.entries()) {
		// Remove systemRole from system actions
		if (action.systemRole) {
			const { systemRole: _, ...actionWithoutRole } = action;
			registry.add(id, actionWithoutRole);
		} else {
			registry.add(id, action);
		}
	}
	return registry;
}

export function createTestEngine(overrides: EngineOverrides = {}) {
	const { rules, skipInitialSetup = false, ...rest } = overrides;
	const baseActions = rest.actions ?? ACTIONS;
	const options = {
		...BASE,
		...rest,
		rules: rules ?? RULES,
		// When skipInitialSetup is true, use actions without system roles
		actions: skipInitialSetup
			? createActionsWithoutSystemRoles(baseActions)
			: baseActions,
	};
	return createEngine(options);
}
