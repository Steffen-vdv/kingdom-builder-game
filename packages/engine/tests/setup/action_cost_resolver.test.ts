import { describe, expect, it } from 'vitest';
import { determineCommonActionCostResource } from '../../src/setup/action_cost_resolver';
import type { ActionMetaCategoryConfig } from '@kingdom-builder/protocol';
import { Registry } from '@kingdom-builder/protocol';

describe('determineCommonActionCostResource', () => {
	it('returns empty resourceId when no meta-categories exist', () => {
		const result = determineCommonActionCostResource(undefined);

		expect(result).toEqual({ resourceId: '', amount: null });
	});

	it('returns empty resourceId when meta-categories registry is empty', () => {
		const metaCategories = new Registry<ActionMetaCategoryConfig>();

		const result = determineCommonActionCostResource(metaCategories);

		expect(result).toEqual({ resourceId: '', amount: null });
	});

	it('returns binding resource from global cost model meta-category', () => {
		const metaCategories = new Registry<ActionMetaCategoryConfig>();
		metaCategories.add('meta:commands', {
			id: 'meta:commands',
			label: 'Commands',
			icon: '⚡',
			bindingResourceId: 'resource:core:command-points',
			costModel: 'global',
			globalCostAmount: 1,
			visibilityTrigger: 'resource-touched',
			order: 0,
		});

		const result = determineCommonActionCostResource(metaCategories);

		expect(result).toEqual({
			resourceId: 'resource:core:command-points',
			amount: 1,
		});
	});

	it('returns binding resource from per-item meta-category when no global exists', () => {
		const metaCategories = new Registry<ActionMetaCategoryConfig>();
		metaCategories.add('meta:research', {
			id: 'meta:research',
			label: 'Research',
			icon: '🔬',
			bindingResourceId: 'resource:core:research-points',
			costModel: 'per-item',
			visibilityTrigger: 'resource-touched',
			order: 1,
		});

		const result = determineCommonActionCostResource(metaCategories);

		expect(result).toEqual({
			resourceId: 'resource:core:research-points',
			amount: null,
		});
	});

	it('prefers global cost model over per-item when both exist', () => {
		const metaCategories = new Registry<ActionMetaCategoryConfig>();
		// Add per-item first to ensure order doesn't matter
		metaCategories.add('meta:research', {
			id: 'meta:research',
			label: 'Research',
			icon: '🔬',
			bindingResourceId: 'resource:core:research-points',
			costModel: 'per-item',
			visibilityTrigger: 'resource-touched',
			order: 1,
		});
		metaCategories.add('meta:commands', {
			id: 'meta:commands',
			label: 'Commands',
			icon: '⚡',
			bindingResourceId: 'resource:core:command-points',
			costModel: 'global',
			globalCostAmount: 2,
			visibilityTrigger: 'resource-touched',
			order: 0,
		});

		const result = determineCommonActionCostResource(metaCategories);

		expect(result).toEqual({
			resourceId: 'resource:core:command-points',
			amount: 2,
		});
	});

	it('handles global cost model with undefined globalCostAmount', () => {
		const metaCategories = new Registry<ActionMetaCategoryConfig>();
		metaCategories.add('meta:commands', {
			id: 'meta:commands',
			label: 'Commands',
			icon: '⚡',
			bindingResourceId: 'resource:core:command-points',
			costModel: 'global',
			// globalCostAmount intentionally omitted
			visibilityTrigger: 'resource-touched',
			order: 0,
		});

		const result = determineCommonActionCostResource(metaCategories);

		expect(result).toEqual({
			resourceId: 'resource:core:command-points',
			amount: null,
		});
	});
});
