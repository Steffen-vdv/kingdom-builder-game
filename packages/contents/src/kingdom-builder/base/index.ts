/**
 * Kingdom Builder - Base Game Content Package
 *
 * This is the full, sophisticated game mode.
 * Other modes (dev-mode, tutorial) can import and extend this.
 */

import type { ContentPackage } from '@kingdom-builder/contents-sdk';
import { createActionRegistry, ACTIONS, ACTION_INFO } from '../../actions';
import { createBuildingRegistry, BUILDINGS, BUILDING_INFO } from '../../buildings';
import { createDevelopmentRegistry, DEVELOPMENT_INFO } from '../../developments';
import { PHASES } from '../../phases';
import { RULES } from '../../rules';
import { buildResourceCatalog } from '../../resource';

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
		buildings: createBuildingRegistry(),
		developments: createDevelopmentRegistry(),
		resources: buildResourceCatalog(),
		rules: RULES,
		phases: PHASES,
		startConfig: {}, // TODO: Add start config
		winConditions: {}, // TODO: Add win conditions
	};
}

// Re-export content definitions for direct access
export { ACTIONS, ACTION_INFO };
export { BUILDINGS, BUILDING_INFO };
export { DEVELOPMENT_INFO };
export { PHASES };
export { RULES };

// Re-export registries for testing and advanced usage
export { createActionRegistry } from '../../actions';
export { createBuildingRegistry } from '../../buildings';
export { createDevelopmentRegistry } from '../../developments';
