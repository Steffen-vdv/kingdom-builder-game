import { describe, expect, it } from 'vitest';
import {
	createSessionRegistries,
	createSessionRegistriesPayload,
} from './sessionRegistries';

describe('sessionRegistries helpers', () => {
	it('seeds action category definitions from content registries', () => {
		const payload = createSessionRegistriesPayload();
		expect(payload.actionCategories).toBeDefined();
		const categories = Object.values(payload.actionCategories ?? {});
		expect(categories.length).toBeGreaterThan(0);
		const [definition] = categories;
		expect(definition?.title).toBeTypeOf('string');
		expect(definition?.layout).toBeTypeOf('string');
	});

	it('clones action category registries when deserializing payloads', () => {
		const payload = createSessionRegistriesPayload();
		const registries = createSessionRegistries();
		const [categoryId] = Object.keys(payload.actionCategories ?? {});
		expect(categoryId).toBeTypeOf('string');
		if (!categoryId) {
			return;
		}
		const originalTitle = payload.actionCategories?.[categoryId]?.title;
		const registryDefinition = registries.actionCategories.get(categoryId);
		registryDefinition.title = 'Mutated Title';
		expect(payload.actionCategories?.[categoryId]?.title).toBe(originalTitle);
	});
});
