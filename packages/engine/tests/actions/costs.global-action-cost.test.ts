import { describe, expect, it } from 'vitest';
import { Resource } from '@kingdom-builder/contents';
import {
	createContentFactory,
	createResourceV2Definition,
} from '@kingdom-builder/testing';

import { getActionCosts } from '../../src/actions/costs.ts';
import { loadResourceV2Registry } from '../../src/resourceV2/registry.ts';
import { createTestEngine } from '../helpers.ts';

function bootstrapGlobalCost(amount: number) {
	const definition = createResourceV2Definition({
		id: Resource.ap,
		name: 'Action Points',
		globalActionCost: amount,
	});
	return loadResourceV2Registry({ resources: [definition] });
}

describe('global action cost enforcement', () => {
	it('applies the ResourceV2 global cost amount to each action', () => {
		const content = createContentFactory();
		const action = content.action({
			baseCosts: { [Resource.ap]: 1 },
		});
		const engineContext = createTestEngine({
			actions: content.actions,
		});
		const registry = bootstrapGlobalCost(1);
		engineContext.resourceV2.setRegistry(registry);

		const costs = getActionCosts(action.id, engineContext);

		expect(costs[Resource.ap]).toBe(1);
	});

	it('rejects attempts to override the global cost amount', () => {
		const content = createContentFactory();
		const action = content.action({
			baseCosts: { [Resource.ap]: 2 },
		});
		const engineContext = createTestEngine({
			actions: content.actions,
		});
		const registry = bootstrapGlobalCost(1);
		engineContext.resourceV2.setRegistry(registry);

		const overrideMessage =
			`Action "${action.id}" attempted to override the global action cost ` +
			`resource "${Resource.ap}". Expected 1, received 2.`;

		expect(() => getActionCosts(action.id, engineContext)).toThrowError(
			overrideMessage,
		);
	});

	it('rejects attempts to omit the global cost resource from non-system actions', () => {
		const content = createContentFactory();
		content.action({
			baseCosts: { [Resource.ap]: 1 },
		});
		const missing = content.action({ baseCosts: {} });
		const engineContext = createTestEngine({
			actions: content.actions,
		});
		const registry = bootstrapGlobalCost(1);
		engineContext.resourceV2.setRegistry(registry);

		const omissionMessage =
			`Action "${missing.id}" omitted the global action cost resource ` +
			`"${Resource.ap}" (expected 1).`;

		expect(() => getActionCosts(missing.id, engineContext)).toThrowError(
			omissionMessage,
		);
	});

	it('allows per-action cost modifiers to adjust the enforced amount', () => {
		const content = createContentFactory();
		const action = content.action({
			baseCosts: { [Resource.ap]: 1 },
		});
		const engineContext = createTestEngine({
			actions: content.actions,
		});
		const registry = bootstrapGlobalCost(1);
		engineContext.resourceV2.setRegistry(registry);

		const modifierId = 'test-global-action-cost-modifier';
		engineContext.passives.registerCostModifier(
			modifierId,
			(actionId, _base) => {
				if (actionId !== action.id) {
					return undefined;
				}

				return { flat: { [Resource.ap]: -1 } };
			},
		);

		const costs = getActionCosts(action.id, engineContext);

		engineContext.passives.unregisterCostModifier(modifierId);
		expect(costs[Resource.ap]).toBe(0);
	});
});
