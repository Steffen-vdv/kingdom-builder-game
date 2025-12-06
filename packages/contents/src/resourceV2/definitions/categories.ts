import { resourceCategory } from '../categoryBuilder';
import type { ResourceCategoryDefinition } from '../types';

/**
 * Primary resource category: core currencies and population.
 * Displayed as the first resource bar row.
 */
const primaryCategory = resourceCategory('resource-category:primary')
	.label('Primary Resources')
	.icon('💎')
	.description('Core resources that drive your turn-by-turn economy and population.')
	.order(1)
	.resource('resource:core:gold')
	.resource('resource:core:action-points')
	.resource('resource:core:castle-hp')
	.resource('resource:core:happiness')
	.group('population')
	.build();

/**
 * Secondary resource category: combat stats and growth modifiers.
 * Displayed as the second resource bar row.
 */
const secondaryCategory = resourceCategory('resource-category:secondary')
	.label('Secondary Resources')
	.icon('📊')
	.description('Combat-related stats and passive growth modifiers.')
	.order(2)
	.resource('resource:core:army-strength')
	.resource('resource:core:fortification-strength')
	.resource('resource:core:absorption')
	.resource('resource:core:growth')
	.resource('resource:core:war-weariness')
	.build();

export const RESOURCE_CATEGORY_DEFINITIONS: readonly ResourceCategoryDefinition[] = [primaryCategory, secondaryCategory];
