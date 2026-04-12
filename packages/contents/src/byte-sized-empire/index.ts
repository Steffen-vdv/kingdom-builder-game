/**
 * Byte-Sized Empire — Content Package
 *
 * A score-based engine-builder game mode where players race
 * to accumulate Victory Points over 30 turns. Features food-
 * population tension, randomized research pools, building-
 * unlocked capabilities, and happiness as a multiplier engine.
 */

import type { ContentPackage } from '@boardsmith/contents-sdk';
import { createResourceRegistry, createResourceGroupRegistry, createResourceCategoryRegistry } from '@boardsmith/contents-sdk';
import { getResourceDefinitions, getResourceGroupDefinitions, getResourceCategoryDefinitions } from './resources';
import { createActionRegistry, createActionMetaCategoryRegistry, createActionCategoryRegistry } from './actions';
import { createBuildingRegistry } from './buildings';
import { createDevelopmentRegistry } from './developments';
import { PHASES } from './phases';
import { RULES } from './rules';

function buildResourceCatalog() {
	return {
		resources: createResourceRegistry(getResourceDefinitions()),
		groups: createResourceGroupRegistry(getResourceGroupDefinitions()),
		categories: createResourceCategoryRegistry(getResourceCategoryDefinitions()),
	};
}

export function createByteSizedEmpirePackage(): ContentPackage {
	return {
		id: 'byte-sized-empire:base',
		name: 'Byte-Sized Empire',
		description: 'Score-based engine-builder. Race to the' + ' highest Victory Points over 30 turns.',
		actions: createActionRegistry(),
		actionMetaCategories: createActionMetaCategoryRegistry(),
		actionCategories: createActionCategoryRegistry(),
		buildings: createBuildingRegistry(),
		developments: createDevelopmentRegistry(),
		resourceCatalog: buildResourceCatalog(),
		rules: RULES,
		phases: PHASES,
		primaryIconId: 'resource:bse:vp',
	};
}
