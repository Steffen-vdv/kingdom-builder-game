import { describe, expect, it } from 'vitest';
import {
	createContentFactory,
	createResourceV2Definition,
} from '@kingdom-builder/testing';
import type { StartConfig } from '@kingdom-builder/protocol';
import { getActionCosts } from '../../src/actions/costs.ts';
import { loadResourceV2Registry } from '../../src/resourceV2/registry.ts';
import { createTestEngine } from '../helpers.ts';

describe('global action cost enforcement', () => {
	it('applies the ResourceV2 global action cost to actions', () => {
		const content = createContentFactory();
		const action = content.action();
		const globalResource = createResourceV2Definition({
			globalActionCost: 3,
		});
		const registry = loadResourceV2Registry({
			resources: [globalResource],
		});
		const start: StartConfig = {
			player: {
				resources: {
					[globalResource.id]: 10,
				},
			},
		};
		const engineContext = createTestEngine({
			actions: content.actions,
			start,
			resourceV2Registry: registry,
		});

		const costs = getActionCosts(action.id, engineContext);

		expect(costs[globalResource.id]).toBe(
			globalResource.globalActionCost?.amount ?? 0,
		);
	});

	it('rejects attempts to override the global action cost', () => {
		const content = createContentFactory();
		const globalResource = createResourceV2Definition({
			globalActionCost: 5,
		});
		const registry = loadResourceV2Registry({
			resources: [globalResource],
		});
		const start: StartConfig = {
			player: {
				resources: {
					[globalResource.id]: 12,
				},
			},
		};
		const baseAmount = globalResource.globalActionCost?.amount ?? 0;
		const overrideAmount = baseAmount + 1;
		const action = content.action({
			baseCosts: { [globalResource.id]: overrideAmount },
		});
		const engineContext = createTestEngine({
			actions: content.actions,
			start,
			resourceV2Registry: registry,
		});

		expect(() => getActionCosts(action.id, engineContext)).toThrow(
			`override the global action cost resource "${globalResource.id}"`,
		);
	});

	it('allows cost modifiers to adjust the enforced global amount', () => {
		const content = createContentFactory();
		const action = content.action();
		const globalResource = createResourceV2Definition({
			globalActionCost: 4,
		});
		const registry = loadResourceV2Registry({
			resources: [globalResource],
		});
		const start: StartConfig = {
			player: {
				resources: {
					[globalResource.id]: 20,
				},
			},
		};
		const engineContext = createTestEngine({
			actions: content.actions,
			start,
			resourceV2Registry: registry,
		});
		engineContext.passives.registerCostModifier('discount', () => ({
			flat: { [globalResource.id]: -1 },
		}));

		const costs = getActionCosts(action.id, engineContext);

		expect(costs[globalResource.id]).toBe(
			(globalResource.globalActionCost?.amount ?? 0) - 1,
		);
	});
});
