/**
 * Action Meta-Category Definitions
 *
 * Meta-categories group actions by their activity type and cost model.
 * Each action must specify which meta-category it belongs to.
 *
 * Current meta-categories:
 * - Commands: Standard commands that cost CP (global cost model)
 * - Research: Research options that cost variable RP (per-item cost model)
 */
import { Registry } from '@kingdom-builder/protocol';
import { actionMetaCategory, type ActionMetaCategoryConfig } from './infrastructure/builders';
import { MetaCategory, ActionCategory } from './constants';
import { Resource } from './internal';

export { MetaCategory } from './constants';
export type { MetaCategoryValue } from './constants';

export function createActionMetaCategoryRegistry() {
	const registry = new Registry<ActionMetaCategoryConfig>();

	registry.add(
		MetaCategory.Commands,
		actionMetaCategory()
			.id(MetaCategory.Commands)
			.label('Commands')
			.icon('⚡')
			.bindingResource(Resource.cp)
			.costModel('global', 1)
			.visibilityTrigger('resource-touched')
			.order(0)
			.categories(ActionCategory.Basic, ActionCategory.Hire, ActionCategory.Develop, ActionCategory.Build)
			.build(),
	);

	registry.add(
		MetaCategory.Research,
		actionMetaCategory().id(MetaCategory.Research).label('Research').icon('🧬').bindingResource(Resource.research).costModel('per-item').visibilityTrigger('resource-touched').order(1).build(),
	);

	return registry;
}

export const ACTION_META_CATEGORIES = createActionMetaCategoryRegistry();
