import { describe, it, expect } from 'vitest';
import { performAction, getActionCosts, advance } from '../../src';
import { createTestEngine } from '../helpers';
import { createContentFactory } from '@kingdom-builder/testing';
import { Resource as CResource, PhaseId } from '@kingdom-builder/contents';

describe('cost_mod effects', () => {
	it('adds and removes cost modifiers', () => {
		const content = createContentFactory();
		const targetAction = content.action({ baseCosts: { [CResource.gold]: 2 } });
		const addModifierAction = content.action({
			effects: [
				{
					type: 'cost_mod',
					method: 'add',
					params: {
						id: 'm',
						actionId: targetAction.id,
						resourceId: CResource.gold,
						amount: 1,
					},
				},
			],
		});
		const removeModifierAction = content.action({
			system: true,
			effects: [
				{
					type: 'cost_mod',
					method: 'remove',
					params: { id: 'm', resourceId: CResource.gold, amount: 0 },
				},
			],
		});
		const engineContext = createTestEngine(content);
		while (engineContext.game.currentPhase !== PhaseId.Main) {
			advance(engineContext);
		}
		const initialCost =
			getActionCosts(targetAction.id, engineContext)[CResource.gold] ?? 0;
		const addModifierCost = getActionCosts(addModifierAction.id, engineContext);
		engineContext.activePlayer.resourceValues[CResource.ap] =
			addModifierCost[CResource.ap] ?? 0;
		engineContext.activePlayer.resourceValues[CResource.gold] =
			addModifierCost[CResource.gold] ?? 0;
		performAction(addModifierAction.id, engineContext);
		const increasedCost =
			getActionCosts(targetAction.id, engineContext)[CResource.gold] ?? 0;
		engineContext.activePlayer.actions.add(removeModifierAction.id);
		performAction(removeModifierAction.id, engineContext);
		const finalCost =
			getActionCosts(targetAction.id, engineContext)[CResource.gold] ?? 0;
		expect(increasedCost).toBe(initialCost + 1);
		expect(finalCost).toBe(initialCost);
	});

	it('supports stacked percentage modifiers after flat adjustments', () => {
		const content = createContentFactory();
		const targetAction = content.action({ baseCosts: { [CResource.gold]: 3 } });
		const addModifiersAction = content.action({
			system: true,
			effects: [
				{
					type: 'cost_mod',
					method: 'add',
					params: {
						id: 'flat',
						actionId: targetAction.id,
						resourceId: CResource.gold,
						amount: 4,
					},
				},
				{
					type: 'cost_mod',
					method: 'add',
					params: {
						id: 'pctA',
						actionId: targetAction.id,
						resourceId: CResource.gold,
						percent: 0.2,
					},
				},
				{
					type: 'cost_mod',
					method: 'add',
					params: {
						id: 'pctB',
						actionId: targetAction.id,
						resourceId: CResource.gold,
						percent: -0.1,
					},
				},
			],
		});
		const engineContext = createTestEngine(content);
		while (engineContext.game.currentPhase !== PhaseId.Main) {
			advance(engineContext);
		}
		engineContext.activePlayer.actions.add(addModifiersAction.id);
		const initialCost =
			getActionCosts(targetAction.id, engineContext)[CResource.gold] ?? 0;
		performAction(addModifiersAction.id, engineContext);
		const finalCost =
			getActionCosts(targetAction.id, engineContext)[CResource.gold] ?? 0;
		const expectedBaseCost = initialCost + 4;
		expect(finalCost).toBeCloseTo(expectedBaseCost * (1 + 0.2 - 0.1));
	});
});
