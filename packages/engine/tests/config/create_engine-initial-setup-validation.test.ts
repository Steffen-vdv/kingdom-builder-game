import { describe, it, expect } from 'vitest';
import { createEngine } from '../../src/index.ts';
import {
	ACTION_META_CATEGORIES,
	BUILDINGS,
	DEVELOPMENTS,
	MetaCategory,
	PHASES,
	RULES,
	RESOURCE_REGISTRY,
	RESOURCE_GROUP_REGISTRY,
	RESOURCE_CATEGORY_REGISTRY,
} from '@kingdom-builder/contents';
import { SystemRole } from '@kingdom-builder/contents-sdk';
import { Registry, actionSchema } from '@kingdom-builder/protocol';
import type { ActionConfig } from '@kingdom-builder/protocol';

/**
 * Tests for initial setup system action validation.
 * These verify that misconfigured initial setup actions cause
 * engine creation to fail with clear error messages.
 */
describe('createEngine initial setup validation', () => {
	const baseConfig = {
		actionMetaCategories: ACTION_META_CATEGORIES,
		buildings: BUILDINGS,
		developments: DEVELOPMENTS,
		phases: PHASES,
		rules: RULES,
		resourceCatalog: {
			resources: RESOURCE_REGISTRY,
			groups: RESOURCE_GROUP_REGISTRY,
			categories: RESOURCE_CATEGORY_REGISTRY,
		},
	};

	function createActionsRegistry(
		...actions: ActionConfig[]
	): Registry<ActionConfig> {
		const registry = new Registry<ActionConfig>(actionSchema);
		for (const action of actions) {
			registry.add(action.id, action);
		}
		return registry;
	}

	describe('unknown resource references', () => {
		it('throws when initial setup references an unknown resource ID', () => {
			const invalidSetupAction: ActionConfig = {
				id: 'test_invalid_setup',
				name: 'Invalid Setup',
				metaCategory: MetaCategory.Commands,
				system: true,
				systemRole: SystemRole.INITIAL_SETUP,
				free: true,
				effects: [
					{
						type: 'resource',
						method: 'add',
						params: {
							resourceId: 'resource:nonexistent:fake',
							change: { type: 'amount', amount: 10 },
						},
					},
				],
			};

			const actions = createActionsRegistry(invalidSetupAction);

			expect(() =>
				createEngine({
					...baseConfig,
					actions,
				}),
			).toThrowError(/unknown resource.*resource:nonexistent:fake/i);
		});

		it('throws when initial setup references a resource group parent', () => {
			// resource:core:total-population is a group parent - derived from children
			const invalidSetupAction: ActionConfig = {
				id: 'test_group_mutation',
				name: 'Invalid Group Mutation',
				metaCategory: MetaCategory.Commands,
				system: true,
				systemRole: SystemRole.INITIAL_SETUP,
				free: true,
				effects: [
					{
						type: 'resource',
						method: 'add',
						params: {
							resourceId: 'resource:core:total-population',
							change: { type: 'amount', amount: 5 },
						},
					},
				],
			};

			const actions = createActionsRegistry(invalidSetupAction);

			expect(() =>
				createEngine({
					...baseConfig,
					actions,
				}),
			).toThrowError(/cannot mutate group parent/i);
		});
	});

	describe('missing or invalid effect params', () => {
		it('throws when effect is missing resourceId', () => {
			const invalidSetupAction: ActionConfig = {
				id: 'test_missing_resource_id',
				name: 'Missing Resource ID',
				metaCategory: MetaCategory.Commands,
				system: true,
				systemRole: SystemRole.INITIAL_SETUP,
				free: true,
				effects: [
					{
						type: 'resource',
						method: 'add',
						params: {
							// Missing resourceId
							change: { type: 'amount', amount: 10 },
						} as Record<string, unknown>,
					},
				],
			};

			const actions = createActionsRegistry(invalidSetupAction);

			expect(() =>
				createEngine({
					...baseConfig,
					actions,
				}),
			).toThrowError(/expected a non-empty resourceId/i);
		});

		it('throws when resource effect is missing params entirely', () => {
			const invalidSetupAction: ActionConfig = {
				id: 'test_missing_params',
				name: 'Missing Params',
				metaCategory: MetaCategory.Commands,
				system: true,
				systemRole: SystemRole.INITIAL_SETUP,
				free: true,
				effects: [
					{
						type: 'resource',
						method: 'add',
						// No params at all
					},
				],
			};

			const actions = createActionsRegistry(invalidSetupAction);

			expect(() =>
				createEngine({
					...baseConfig,
					actions,
				}),
			).toThrowError(/missing required params/i);
		});

		it('throws when amount is not a valid number', () => {
			const invalidSetupAction: ActionConfig = {
				id: 'test_invalid_amount',
				name: 'Invalid Amount',
				metaCategory: MetaCategory.Commands,
				system: true,
				systemRole: SystemRole.INITIAL_SETUP,
				free: true,
				effects: [
					{
						type: 'resource',
						method: 'add',
						params: {
							resourceId: 'resource:core:gold',
							change: { type: 'amount', amount: NaN },
						},
					},
				],
			};

			const actions = createActionsRegistry(invalidSetupAction);

			expect(() =>
				createEngine({
					...baseConfig,
					actions,
				}),
			).toThrowError(/expected numeric amount/i);
		});
	});

	describe('system action constraints', () => {
		it('throws when trying to run a non-system action as system action', () => {
			const nonSystemAction: ActionConfig = {
				id: 'test_non_system',
				name: 'Non-System Action',
				metaCategory: MetaCategory.Commands,
				system: false, // Not a system action
				systemRole: SystemRole.INITIAL_SETUP, // Has role but system=false
				effects: [
					{
						type: 'resource',
						method: 'add',
						params: {
							resourceId: 'resource:core:gold',
							change: { type: 'amount', amount: 10 },
						},
					},
				],
			};

			const actions = createActionsRegistry(nonSystemAction);

			expect(() =>
				createEngine({
					...baseConfig,
					actions,
				}),
			).toThrowError(/cannot run non-system action.*as system action/i);
		});
	});

	describe('resource bounds enforcement', () => {
		it('clamps resource values to lower bounds during initial setup', () => {
			// Gold has lowerBound(0) - try to remove more gold than exists
			const underflowSetupAction: ActionConfig = {
				id: 'test_underflow_setup',
				name: 'Underflow Setup',
				metaCategory: MetaCategory.Commands,
				system: true,
				systemRole: SystemRole.INITIAL_SETUP,
				free: true,
				effects: [
					// Start with some gold
					{
						type: 'resource',
						method: 'add',
						params: {
							resourceId: 'resource:core:gold',
							change: { type: 'amount', amount: 5 },
						},
					},
					// Then try to remove way more than we have
					{
						type: 'resource',
						method: 'remove',
						params: {
							resourceId: 'resource:core:gold',
							change: { type: 'amount', amount: 100 },
						},
					},
				],
			};

			const actions = createActionsRegistry(underflowSetupAction);

			// This should NOT throw - bounds are clamped, not rejected
			const ctx = createEngine({
				...baseConfig,
				actions,
			});

			// Gold should be clamped to lower bound (0), not negative
			const gold = ctx.activePlayer.resourceValues['resource:core:gold'];
			expect(gold).toBe(0);
		});
	});

	describe('development and building effects in initial setup', () => {
		it('throws when initial setup references unknown development', () => {
			const invalidSetupAction: ActionConfig = {
				id: 'test_unknown_development',
				name: 'Unknown Development',
				metaCategory: MetaCategory.Commands,
				system: true,
				systemRole: SystemRole.INITIAL_SETUP,
				free: true,
				effects: [
					{
						type: 'land',
						method: 'add',
						params: { slotsMax: 2 },
					},
					{
						type: 'development',
						method: 'add',
						params: {
							id: 'nonexistent_development',
							landIndex: 0,
						},
					},
				],
			};

			const actions = createActionsRegistry(invalidSetupAction);

			expect(() =>
				createEngine({
					...baseConfig,
					actions,
				}),
			).toThrowError(/nonexistent_development/i);
		});

		it('throws when initial setup references unknown building', () => {
			const invalidSetupAction: ActionConfig = {
				id: 'test_unknown_building',
				name: 'Unknown Building',
				metaCategory: MetaCategory.Commands,
				system: true,
				systemRole: SystemRole.INITIAL_SETUP,
				free: true,
				effects: [
					{
						type: 'building',
						method: 'add',
						params: { id: 'nonexistent_building' },
					},
				],
			};

			const actions = createActionsRegistry(invalidSetupAction);

			expect(() =>
				createEngine({
					...baseConfig,
					actions,
				}),
			).toThrowError(/nonexistent_building/i);
		});
	});
});
