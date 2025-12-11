import { describe, expect, it } from 'vitest';
import {
	ACTIONS,
	TRIGGER_META,
	OVERVIEW_CONTENT,
	BUILDINGS,
	DEVELOPMENTS,
	POPULATIONS,
	PHASES,
	ACTION_CATEGORIES,
	RESOURCE_REGISTRY,
} from '@kingdom-builder/contents';
import { buildSessionMetadata } from '../../src/session/sessionMetadataBuilder.js';

describe('buildSessionMetadata', () => {
	it('clones registries into frozen payloads', () => {
		const { registries } = buildSessionMetadata();
		const [actionId, actionDef] = ACTIONS.entries()[0];
		const clonedAction = registries.actions[actionId];
		expect(clonedAction).toBeDefined();
		expect(clonedAction).not.toBe(actionDef);
		expect(clonedAction).toEqual(actionDef);
		expect(Object.isFrozen(clonedAction)).toBe(true);
	});

	it('copies resource formatting metadata including displayAsPercent', () => {
		const { metadata } = buildSessionMetadata();
		// Find a resource with displayAsPercent in the registry
		const resourceWithPercent = RESOURCE_REGISTRY.ordered.find(
			(resource) => resource.displayAsPercent,
		);
		expect(resourceWithPercent).toBeDefined();
		if (!resourceWithPercent) {
			throw new Error(
				'Expected resource with displayAsPercent in content definitions.',
			);
		}
		const resourceMetadata = metadata.resources?.[resourceWithPercent.id];
		expect(resourceMetadata).toBeDefined();
		expect(resourceMetadata?.displayAsPercent).toBe(
			resourceWithPercent.displayAsPercent,
		);
	});

	it('includes trigger metadata from content definitions', () => {
		const { metadata } = buildSessionMetadata();
		const [triggerId, triggerMeta] = Object.entries(TRIGGER_META)[0];
		const triggerMetadata = metadata.triggers?.[triggerId];
		expect(triggerMetadata).toBeDefined();
		expect(triggerMetadata?.label).toBe(triggerMeta.label);
		// Step triggers derive icon from phase, event triggers use their own
		if (triggerMeta.type === 'event') {
			expect(triggerMetadata?.icon).toBe(triggerMeta.icon);
		}
	});

	it('clones overview content including hero tokens', () => {
		const { overviewContent } = buildSessionMetadata();
		const [tokenKey, tokenValue] =
			Object.entries(OVERVIEW_CONTENT.hero.tokens)[0] ?? [];
		expect(overviewContent).not.toBe(OVERVIEW_CONTENT);
		expect(Object.isFrozen(overviewContent)).toBe(true);
		if (tokenKey && tokenValue) {
			expect(overviewContent.hero.tokens[tokenKey]).toBe(tokenValue);
		} else {
			expect(Object.keys(overviewContent.hero.tokens).length).toBeGreaterThan(
				0,
			);
		}
	});

	it('builds resource metadata with icons and descriptions', () => {
		const { metadata } = buildSessionMetadata();
		// Find a resource with description in registry
		const resourceWithDescription = RESOURCE_REGISTRY.ordered.find(
			(resource) => resource.description,
		);
		expect(resourceWithDescription).toBeDefined();
		if (resourceWithDescription) {
			const resourceMeta = metadata.resources?.[resourceWithDescription.id];
			expect(resourceMeta).toBeDefined();
			expect(resourceMeta?.description).toBe(
				resourceWithDescription.description,
			);
			expect(resourceMeta?.icon).toBe(resourceWithDescription.icon);
			expect(resourceMeta?.label).toBe(resourceWithDescription.label);
		}
	});

	it('builds resource registry with optional tags', () => {
		const { registries } = buildSessionMetadata();
		// Find a resource with tags in registry
		const resourceWithTags = RESOURCE_REGISTRY.ordered.find(
			(resource) => resource.tags && resource.tags.length > 0,
		);
		if (resourceWithTags) {
			const resourceDef = registries.resources[resourceWithTags.id];
			expect(resourceDef).toBeDefined();
			expect(resourceDef?.tags).toEqual(resourceWithTags.tags);
		}
		// Find a resource without tags
		const resourceWithoutTags = RESOURCE_REGISTRY.ordered.find(
			(resource) => !resource.tags || resource.tags.length === 0,
		);
		if (resourceWithoutTags) {
			const resourceDef = registries.resources[resourceWithoutTags.id];
			expect(resourceDef).toBeDefined();
			expect(resourceDef?.tags).toBeUndefined();
		}
	});

	it('builds population resource metadata from registry', () => {
		const { metadata } = buildSessionMetadata();
		// Population resources have their metadata in the resources object
		const [populationId] = POPULATIONS.entries()[0];
		const resourceMeta = metadata.resources?.[populationId];
		expect(resourceMeta).toBeDefined();
		// Should have a label from the resource registry
		expect(resourceMeta?.label).toBeTruthy();
	});

	it('builds population resource metadata with icon when available', () => {
		const { metadata } = buildSessionMetadata();
		// Find a population that has a matching resource with an icon
		for (const [id] of POPULATIONS.entries()) {
			const v2Resource = RESOURCE_REGISTRY.byId[id];
			if (v2Resource?.icon) {
				const resourceMeta = metadata.resources?.[id];
				expect(resourceMeta?.icon).toBe(v2Resource.icon);
				break;
			}
		}
	});

	it('builds population resource metadata with description when available', () => {
		const { metadata } = buildSessionMetadata();
		for (const [id] of POPULATIONS.entries()) {
			const v2Resource = RESOURCE_REGISTRY.byId[id];
			if (v2Resource?.description) {
				const resourceMeta = metadata.resources?.[id];
				expect(resourceMeta?.description).toBe(v2Resource.description);
				break;
			}
		}
	});

	it('builds building metadata with names, icons and descriptions', () => {
		const { metadata } = buildSessionMetadata();
		const [buildingId, buildingDef] = BUILDINGS.entries()[0];
		const buildingMeta = metadata.buildings?.[buildingId];
		expect(buildingMeta).toBeDefined();
		const expectedName =
			typeof (buildingDef as { name?: unknown })?.name === 'string'
				? (buildingDef as { name: string }).name
				: buildingId;
		expect(buildingMeta?.label).toBe(expectedName);
		// Check icon if present
		const icon = (buildingDef as { icon?: unknown })?.icon;
		if (typeof icon === 'string') {
			expect(buildingMeta?.icon).toBe(icon);
		}
		// Check description if present
		const description = (buildingDef as { description?: unknown })?.description;
		if (typeof description === 'string') {
			expect(buildingMeta?.description).toBe(description);
		}
	});

	it('builds development metadata with names, icons and descriptions', () => {
		const { metadata } = buildSessionMetadata();
		const [developmentId, developmentDef] = DEVELOPMENTS.entries()[0];
		const developmentMeta = metadata.developments?.[developmentId];
		expect(developmentMeta).toBeDefined();
		const expectedName =
			typeof (developmentDef as { name?: unknown })?.name === 'string'
				? (developmentDef as { name: string }).name
				: developmentId;
		expect(developmentMeta?.label).toBe(expectedName);
		// Check icon if present
		const icon = (developmentDef as { icon?: unknown })?.icon;
		if (typeof icon === 'string') {
			expect(developmentMeta?.icon).toBe(icon);
		}
	});

	it('builds phase metadata with labels, icons, action flags and steps', () => {
		const { metadata } = buildSessionMetadata();
		for (const phase of PHASES) {
			const phaseMeta = metadata.phases?.[phase.id];
			expect(phaseMeta).toBeDefined();
			expect(phaseMeta?.id).toBe(phase.id);
			// Check optional fields
			if (typeof phase.label === 'string') {
				expect(phaseMeta?.label).toBe(phase.label);
			}
			if (typeof phase.icon === 'string') {
				expect(phaseMeta?.icon).toBe(phase.icon);
			}
			if (typeof phase.action === 'boolean') {
				expect(phaseMeta?.action).toBe(phase.action);
			}
			// Check steps
			if (Array.isArray(phase.steps) && phase.steps.length > 0) {
				expect(phaseMeta?.steps).toHaveLength(phase.steps.length);
				for (let i = 0; i < phase.steps.length; i++) {
					const step = phase.steps[i];
					const stepMeta = phaseMeta?.steps?.[i];
					expect(stepMeta?.id).toBe(step.id);
					if (step.title) {
						expect(stepMeta?.label).toBe(step.title);
					}
					if (step.icon) {
						expect(stepMeta?.icon).toBe(step.icon);
					}
					if (Array.isArray(step.triggers)) {
						expect(stepMeta?.triggers).toEqual(
							step.triggers.map((t) => String(t)),
						);
					}
				}
			}
		}
	});

	it('builds action category registry with optional fields', () => {
		const { registries } = buildSessionMetadata();
		for (const [id, definition] of ACTION_CATEGORIES.entries()) {
			const category = registries.actionCategories?.[id];
			expect(category).toBeDefined();
			expect(category?.id).toBe(definition.id);
			expect(category?.title).toBe(definition.label);
			expect(category?.icon).toBe(definition.icon);
			expect(category?.order).toBe(definition.order);
			// Check optional fields
			if (definition.description) {
				expect(category?.description).toBe(definition.description);
			}
			if (definition.hideWhenEmpty) {
				expect(category?.hideWhenEmpty).toBe(definition.hideWhenEmpty);
			}
			if (definition.analyticsKey) {
				expect(category?.analyticsKey).toBe(definition.analyticsKey);
			}
		}
	});

	it('builds trigger metadata with label, icon, and text strings', () => {
		const { metadata } = buildSessionMetadata();
		for (const [triggerId, triggerDef] of Object.entries(TRIGGER_META)) {
			const triggerMeta = metadata.triggers?.[triggerId];
			expect(triggerMeta).toBeDefined();
			expect(triggerMeta?.label).toBe(triggerDef.label);
			// All triggers should have icon and text generated
			expect(triggerMeta?.icon).toBeDefined();
			expect(triggerMeta?.text).toBeDefined();
			// Event triggers use their own icon directly
			if (triggerDef.type === 'event') {
				expect(triggerMeta?.icon).toBe(triggerDef.icon);
			}
		}
	});

	it('includes asset metadata entries', () => {
		const { metadata } = buildSessionMetadata();
		expect(metadata.assets?.population).toBeDefined();
		expect(metadata.assets?.land).toBeDefined();
		expect(metadata.assets?.slot).toBeDefined();
		expect(metadata.assets?.passive).toBeDefined();
		expect(metadata.assets?.developments).toBeDefined();
	});

	it('freezes nested objects deeply', () => {
		const { registries, metadata } = buildSessionMetadata();
		// Check that nested arrays in registries are frozen
		const actionId = Object.keys(registries.actions)[0];
		const action = registries.actions[actionId];
		if (action && Array.isArray((action as { effects?: unknown[] }).effects)) {
			expect(Object.isFrozen((action as { effects: unknown[] }).effects)).toBe(
				true,
			);
		}
		// Check that nested metadata objects are frozen
		const phaseId = Object.keys(metadata.phases ?? {})[0];
		const phaseMeta = metadata.phases?.[phaseId];
		if (phaseMeta) {
			expect(Object.isFrozen(phaseMeta)).toBe(true);
			if (phaseMeta.steps) {
				expect(Object.isFrozen(phaseMeta.steps)).toBe(true);
			}
		}
	});

	it('includes resources and resourceGroups in registries', () => {
		const { registries } = buildSessionMetadata();
		expect(registries.resources).toBeDefined();
		expect(registries.resourceGroups).toBeDefined();
		expect(Object.keys(registries.resources ?? {})).not.toHaveLength(0);
	});

	it('builds core resource metadata for all resource types', () => {
		const { metadata } = buildSessionMetadata();
		// Verify we have resources in metadata
		const resourceKeys = Object.keys(metadata.resources ?? {});
		expect(resourceKeys.length).toBeGreaterThan(0);
		// Check that we have at least one core resource
		const coreResources = resourceKeys.filter((key) =>
			key.startsWith('resource:core:'),
		);
		expect(coreResources.length).toBeGreaterThan(0);
	});

	it('handles resources without displayAsPercent flag', () => {
		const { metadata } = buildSessionMetadata();
		// Find a resource without displayAsPercent
		const resourceWithoutPercent = RESOURCE_REGISTRY.ordered.find(
			(resource) => !resource.displayAsPercent,
		);
		if (resourceWithoutPercent) {
			const resourceMeta = metadata.resources?.[resourceWithoutPercent.id];
			expect(resourceMeta).toBeDefined();
			expect(resourceMeta?.displayAsPercent).toBeUndefined();
		}
	});
});
