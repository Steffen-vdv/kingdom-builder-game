/**
 * Kingdom Builder - Base Game Content Package
 *
 * This is the full, sophisticated game mode.
 * Other modes (dev-mode, tutorial) can import and extend this.
 */

import type { ContentPackage } from '@kingdom-builder/contents-sdk';
import { createActionRegistry, ACTIONS, ACTION_INFO } from '../content/actions';
import { createBuildingRegistry, BUILDINGS, BUILDING_INFO } from '../content/buildings';
import { createDevelopmentRegistry, DEVELOPMENT_INFO } from '../content/developments';
import { createActionMetaCategoryRegistry } from '../content/actionMetaCategories';
import { createActionCategoryRegistry } from '../content/actionCategories';
import { PHASES } from '../content/phases';
import { RULES } from '../content/rules';
import { buildResourceCatalog } from '../content/resource';
import { PRIMARY_ICON_ID } from '../content/startup';

/**
 * Creates the base game content package.
 * This factory pattern allows lazy initialization and potential modification.
 */
export function createBasePackage(): ContentPackage {
	return {
		id: 'kingdom-builder:base',
		name: 'Kingdom Builder',
		description: 'The full Kingdom Builder experience',
		actions: createActionRegistry(),
		actionMetaCategories: createActionMetaCategoryRegistry(),
		actionCategories: createActionCategoryRegistry(),
		buildings: createBuildingRegistry(),
		developments: createDevelopmentRegistry(),
		resourceCatalog: buildResourceCatalog(),
		rules: RULES,
		phases: PHASES,
		primaryIconId: PRIMARY_ICON_ID,
	};
}

// Re-export content definitions for direct access
export { ACTIONS, ACTION_INFO };
export { BUILDINGS, BUILDING_INFO };
export { DEVELOPMENT_INFO };
export { PHASES };
export { RULES };

// Re-export registries for testing and advanced usage
export { createActionRegistry } from '../content/actions';
export { createBuildingRegistry } from '../content/buildings';
export { createDevelopmentRegistry } from '../content/developments';
