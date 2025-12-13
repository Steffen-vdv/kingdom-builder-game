import { describe, it, expect } from 'vitest';
import { performAction, advance, getActionCosts } from '../../src';
import { createTestEngine } from '../helpers';
import { createContentFactory } from '@kingdom-builder/testing';
import { Resource as CResource, PhaseId } from '@kingdom-builder/contents';
import { getCatalogIndexes } from '../../src/resource';
import { resourceAmountParams } from '../helpers/resourceParams';

describe('resource effects for population', () => {
	it('adds and removes population via resource effects', () => {
		const content = createContentFactory();
		// Use a real population role that's registered in the Resource catalog
		const roleId = CResource.legion;
		const add = content.action({
			effects: [
				{
					type: 'resource',
					method: 'add',
					params: resourceAmountParams({ resourceId: roleId, amount: 1 }),
				},
				{
					type: 'resource',
					method: 'add',
					params: resourceAmountParams({ resourceId: roleId, amount: 1 }),
				},
			],
		});
		const remove = content.action({
			effects: [
				{
					type: 'resource',
					method: 'remove',
					params: resourceAmountParams({ resourceId: roleId, amount: 1 }),
				},
			],
		});
		const engineContext = createTestEngine(content);
		while (engineContext.game.currentPhase !== PhaseId.Main) {
			advance(engineContext);
		}
		// Get initial population count
		const initialCount = engineContext.activePlayer.resourceValues[roleId] ?? 0;
		let cost = getActionCosts(add.id, engineContext);
		engineContext.activePlayer.resourceValues[CResource.ap] =
			cost[CResource.ap] ?? 0;
		performAction(add.id, engineContext);
		const added = add.effects.filter((e) => e.method === 'add').length;
		// roleId IS the Resource ID
		expect(engineContext.activePlayer.resourceValues[roleId]).toBe(
			initialCount + added,
		);
		const catalog = engineContext.resourceCatalog;
		expect(catalog).toBeDefined();
		// roleId IS the resourceId directly
		const resourceId = roleId;
		expect(engineContext.activePlayer.resourceValues[resourceId]).toBe(
			initialCount + added,
		);
		const indexes = getCatalogIndexes(catalog);
		const parentId = catalog.groups.ordered.find((group) => {
			const childIds = indexes.groupChildren[group.id] ?? [];
			return childIds.includes(resourceId);
		})?.parent?.id;
		expect(parentId).toBeDefined();
		cost = getActionCosts(remove.id, engineContext);
		engineContext.activePlayer.resourceValues[CResource.ap] =
			cost[CResource.ap] ?? 0;
		performAction(remove.id, engineContext);
		const removed = remove.effects.filter((e) => e.method === 'remove').length;
		expect(engineContext.activePlayer.resourceValues[roleId]).toBe(
			initialCount + added - removed,
		);
		expect(engineContext.activePlayer.resourceValues[resourceId]).toBe(
			initialCount + added - removed,
		);
	});
});
