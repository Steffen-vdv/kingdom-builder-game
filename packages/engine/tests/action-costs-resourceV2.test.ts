import { describe, expect, it } from 'vitest';
import { createContentFactory } from '@kingdom-builder/testing';
import { hydrateResourceV2Metadata } from '../src/resourcesV2/index.ts';
import { createTestEngine } from './helpers.ts';
import { getActionCosts } from '../src/actions/costs.ts';

describe('ResourceV2 global action cost enforcement', () => {
	it('applies the global action cost amount to non-system actions', () => {
		const content = createContentFactory();
		const standardAction = content.action();
		const catalog = hydrateResourceV2Metadata(
			content.resourcesV2,
			content.resourceGroups,
		);
		const engineContext = createTestEngine({
			actions: content.actions,
			resourceV2Catalog: catalog,
		});
		const actionCostResource = engineContext.actionCostResource;
		const definition = catalog.resourcesById[actionCostResource];
		if (!definition?.globalActionCost) {
			throw new Error(
				'Expected catalog to define a global action cost resource.',
			);
		}

		const costs = getActionCosts(standardAction.id, engineContext);
		expect(costs[actionCostResource]).toBe(definition.globalActionCost.amount);
	});

	it('exempts system actions from global action cost enforcement', () => {
		const content = createContentFactory();
		const systemAction = content.action({ system: true });
		const catalog = hydrateResourceV2Metadata(
			content.resourcesV2,
			content.resourceGroups,
		);
		const engineContext = createTestEngine({
			actions: content.actions,
			resourceV2Catalog: catalog,
		});
		const actionCostResource = engineContext.actionCostResource;

		const costs = getActionCosts(systemAction.id, engineContext);
		expect(costs[actionCostResource]).toBe(0);
	});

	it('throws when a non-system action overrides the global cost resource', () => {
		const content = createContentFactory();
		const catalog = hydrateResourceV2Metadata(
			content.resourcesV2,
			content.resourceGroups,
		);
		const actionCostResource = catalog.orderedResourceIds.find((resourceId) => {
			const definition = catalog.resourcesById[resourceId];
			return Boolean(definition?.globalActionCost);
		});
		if (!actionCostResource) {
			throw new Error(
				'Expected catalog to expose a global action cost resource.',
			);
		}
		const violatingAction = content.action({
			baseCosts: { [actionCostResource]: 5 },
		});
		const engineContext = createTestEngine({
			actions: content.actions,
			resourceV2Catalog: catalog,
		});

		expect(() => getActionCosts(violatingAction.id, engineContext)).toThrow(
			`cannot override the global action cost resource ${actionCostResource}`,
		);
	});

	it('throws when multiple resources declare global action costs', () => {
		const content = createContentFactory();
		content.resourceV2((builder) =>
			builder
				.id('duplicate-action-cost')
				.name('Duplicate Action Cost')
				.order(999)
				.globalActionCost(2),
		);
		const catalog = hydrateResourceV2Metadata(
			content.resourcesV2,
			content.resourceGroups,
		);

		expect(() =>
			createTestEngine({
				actions: content.actions,
				resourceV2Catalog: catalog,
			}),
		).toThrow('Multiple ResourceV2 definitions declare globalActionCost');
	});
});
