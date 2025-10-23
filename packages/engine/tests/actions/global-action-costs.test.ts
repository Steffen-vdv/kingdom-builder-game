import { describe, expect, it } from 'vitest';
import { Resource as CResource } from '@kingdom-builder/contents';
import {
	createContentFactory,
	createResourceV2Definition,
} from '@kingdom-builder/testing';
import { getActionCosts } from '../../src';
import { createTestEngine } from '../helpers';
import { loadResourceV2Registry } from '../../src/resourceV2/registry';

describe('global action cost enforcement', () => {
	it('applies ResourceV2 metadata to non-system actions', () => {
		const content = createContentFactory();
		const action = content.action();
		const registry = loadResourceV2Registry({
			resources: [
				createResourceV2Definition({
					id: CResource.ap,
					globalActionCost: 3,
				}),
			],
		});
		const engineContext = createTestEngine({
			actions: content.actions,
			resourceV2Registry: registry,
		});
		const costs = getActionCosts(action.id, engineContext);
		expect(costs[CResource.ap]).toBe(3);
		expect(engineContext.actionCostResource).toBe(CResource.ap);
	});

	it('rejects base cost overrides for the global action cost resource', () => {
		const content = createContentFactory();
		const action = content.action({
			baseCosts: { [CResource.ap]: 1 },
		});
		const registry = loadResourceV2Registry({
			resources: [
				createResourceV2Definition({
					id: CResource.ap,
					globalActionCost: 2,
				}),
			],
		});
		const engineContext = createTestEngine({
			actions: content.actions,
			resourceV2Registry: registry,
		});
		expect(() => {
			getActionCosts(action.id, engineContext);
		}).toThrowError('cannot override global action cost resource');
	});

	it('allows per-action cost modifiers to adjust the global cost', () => {
		const content = createContentFactory();
		const action = content.action();
		const registry = loadResourceV2Registry({
			resources: [
				createResourceV2Definition({
					id: CResource.ap,
					globalActionCost: 4,
				}),
			],
		});
		const engineContext = createTestEngine({
			actions: content.actions,
			resourceV2Registry: registry,
		});
		engineContext.passives.registerCostModifier('discount', () => ({
			flat: { [CResource.ap]: -2 },
		}));
		const costs = getActionCosts(action.id, engineContext);
		expect(costs[CResource.ap]).toBe(2);
	});
});
