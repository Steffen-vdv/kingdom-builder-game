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
import { actionMetaCategory, type ActionMetaCategoryConfig, pool, tierProgressionCurve, tierWeights } from './infrastructure/builders';
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
		actionMetaCategory()
			.id(MetaCategory.Research)
			.label('Research')
			.icon('🧬')
			.bindingResource(Resource.research)
			.costModel('per-item')
			.visibilityTrigger('resource-touched')
			.order(1)
			.pool(
				pool()
					.size(3)
					.fillMode(
						tierProgressionCurve()
							.threshold(0, tierWeights().tier(1, 100).tier(2, 5).tier(3, 1))
							.threshold(15, tierWeights().tier(1, 70).tier(2, 25).tier(3, 5))
							.threshold(40, tierWeights().tier(1, 40).tier(2, 45).tier(3, 15))
							.threshold(80, tierWeights().tier(1, 20).tier(2, 50).tier(3, 30))
							.threshold(150, tierWeights().tier(1, 10).tier(2, 40).tier(3, 50))
							.build(),
					),
			)
			.build(),
	);

	return registry;
}

export const ACTION_META_CATEGORIES = createActionMetaCategoryRegistry();
