import { describe, expect, it } from 'vitest';
import { Resource, type ResourceKey } from '@kingdom-builder/contents';
import { createContentFactory } from '@kingdom-builder/testing';
import type { ActionConfig } from '@kingdom-builder/protocol';
import {
	cloneRegistry,
	cloneActionCategoryRegistry,
	freezeSerializedRegistry,
} from '../../src/session/registryUtils.js';

function getFirstResourceKey(): ResourceKey {
	const [key] = Object.values(Resource) as ResourceKey[];
	if (!key) {
		throw new Error('Expected at least one resource in contents.');
	}
	return key;
}

describe('cloneRegistry', () => {
	it('creates deep copies without sharing nested references', () => {
		const factory = createContentFactory();
		const resourceKey = getFirstResourceKey();
		const action = factory.action({
			tiers: {
				'1': {
					costs: { [resourceKey]: 3 },
					effects: [
						{
							type: 'resource',
							method: 'add',
							params: {
								resource: resourceKey,
								amount: 1,
							},
						},
					],
				},
			},
		});
		const original = factory.actions.get(action.id);

		const cloned = cloneRegistry(factory.actions);
		const clonedEntry = cloned[action.id];

		expect(clonedEntry).toEqual(original);
		expect(clonedEntry).not.toBe(original);
		expect(clonedEntry.tiers['1'].costs).not.toBe(original.tiers['1'].costs);
		expect(clonedEntry.tiers['1'].effects).not.toBe(
			original.tiers['1'].effects,
		);

		(original.tiers['1'].costs as Record<string, number>)[resourceKey] = 6;
		expect(clonedEntry.tiers['1'].costs?.[resourceKey]).toBe(3);

		(
			clonedEntry.tiers['1'].effects[0].params as Record<string, unknown>
		).amount = 5;
		expect(original.tiers['1'].effects[0].params?.amount).toBe(1);
	});

	it('preserves pool config on meta-categories that define one', () => {
		const factory = createContentFactory();
		const source = factory.actionMetaCategories
			.entries()
			.find(([, definition]) => definition.pool !== undefined);
		if (!source) {
			throw new Error(
				'Expected at least one meta-category with a pool for this test.',
			);
		}
		const [sourceId, sourceDefinition] = source;

		const cloned = cloneRegistry(factory.actionMetaCategories);
		const clonedEntry = cloned[sourceId];

		expect(clonedEntry.pool).toBeDefined();
		expect(clonedEntry.pool).toEqual(sourceDefinition.pool);
		expect(clonedEntry.pool).not.toBe(sourceDefinition.pool);
		expect(clonedEntry.pool?.fillMode.type).toBe('tier-progression-curve');
	});
});

describe('cloneActionCategoryRegistry', () => {
	it('preserves optional metadata only when provided', () => {
		const factory = createContentFactory();
		const categoryWithMetadata = factory.category({
			description: 'desc',
			hideWhenEmpty: true,
			analyticsKey: 'analytics-key',
		});
		const categoryWithoutMetadata = factory.category({
			hideWhenEmpty: false,
			analyticsKey: '',
		});

		const cloned = cloneActionCategoryRegistry(factory.categories);

		const withMetadata = cloned[categoryWithMetadata.id];
		expect(withMetadata.description).toBe(categoryWithMetadata.description);
		expect(withMetadata.hideWhenEmpty).toBe(true);
		expect(withMetadata.analyticsKey).toBe(categoryWithMetadata.analyticsKey);
		expect(withMetadata.title).toBe(categoryWithMetadata.label);

		const withoutMetadata = cloned[categoryWithoutMetadata.id];
		expect(withoutMetadata.title).toBe(categoryWithoutMetadata.label);
		expect(withoutMetadata.description).toBeUndefined();
		expect(withoutMetadata.hideWhenEmpty).toBeUndefined();
		expect(withoutMetadata.analyticsKey).toBeUndefined();

		withMetadata.title = 'mutated title';
		expect(categoryWithMetadata.label).not.toBe('mutated title');
	});
});

describe('freezeSerializedRegistry', () => {
	it('freezes cloned registries so they cannot be mutated', () => {
		const factory = createContentFactory();
		const resourceKey = getFirstResourceKey();
		const action = factory.action({
			tiers: {
				'1': {
					costs: { [resourceKey]: 4 },
					effects: [
						{
							type: 'resource',
							method: 'add',
							params: {
								resource: resourceKey,
								amount: 2,
							},
						},
					],
				},
			},
		});

		const frozen = freezeSerializedRegistry(cloneRegistry(factory.actions));
		const entry = frozen[action.id];

		expect(Object.isFrozen(frozen)).toBe(true);
		expect(Object.isFrozen(entry)).toBe(true);

		expect(() => {
			(frozen as Record<string, ActionConfig>).extra = action;
		}).toThrow(TypeError);

		expect(() => {
			(entry as ActionConfig).name = 'changed';
		}).toThrow(TypeError);

		expect(entry.tiers['1'].costs?.[resourceKey]).toBe(4);
	});
});
