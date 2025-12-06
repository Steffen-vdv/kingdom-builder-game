import { describe, expect, it } from 'vitest';
import {
	Resource,
	type ResourceKey,
} from '@kingdom-builder/contents/resourceKeys';
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
			baseCosts: { [resourceKey]: 3 },
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
		});
		const original = factory.actions.get(action.id);

		const cloned = cloneRegistry(factory.actions);
		const clonedEntry = cloned[action.id];

		expect(clonedEntry).toEqual(original);
		expect(clonedEntry).not.toBe(original);
		expect(clonedEntry.baseCosts).not.toBe(original.baseCosts);
		expect(clonedEntry.effects).not.toBe(original.effects);

		(original.baseCosts as Record<string, number>)[resourceKey] = 6;
		expect(clonedEntry.baseCosts?.[resourceKey]).toBe(3);

		(
			(clonedEntry.effects?.[0] as ActionConfig['effects'][number])
				.params as Record<string, unknown>
		).amount = 5;
		expect(
			(original.effects?.[0] as ActionConfig['effects'][number]).params?.amount,
		).toBe(1);
	});
});

describe('cloneActionCategoryRegistry', () => {
	it('preserves optional metadata only when provided', () => {
		const factory = createContentFactory();
		const categoryWithMetadata = factory.category({
			description: 'desc',
			hideWhenEmpty: true,
			analyticsKey: 'analytics-key',
			subtitle: 'custom subtitle',
		});
		const categoryWithoutMetadata = factory.category({
			hideWhenEmpty: false,
			analyticsKey: '',
			subtitle: undefined,
		});

		const cloned = cloneActionCategoryRegistry(factory.categories);

		const withMetadata = cloned[categoryWithMetadata.id];
		expect(withMetadata.description).toBe(categoryWithMetadata.description);
		expect(withMetadata.hideWhenEmpty).toBe(true);
		expect(withMetadata.analyticsKey).toBe(categoryWithMetadata.analyticsKey);
		expect(withMetadata.subtitle).toBe(categoryWithMetadata.subtitle);
		expect(withMetadata.title).toBe(categoryWithMetadata.label);

		const withoutMetadata = cloned[categoryWithoutMetadata.id];
		expect(withoutMetadata.title).toBe(categoryWithoutMetadata.label);
		expect(withoutMetadata.subtitle).toBe(
			categoryWithoutMetadata.subtitle ?? categoryWithoutMetadata.label,
		);
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
			baseCosts: { [resourceKey]: 4 },
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

		expect(entry.baseCosts?.[resourceKey]).toBe(4);
	});
});
