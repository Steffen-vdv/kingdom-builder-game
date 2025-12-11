import { describe, it, expect } from 'vitest';
import { performAction, advance, getActionCosts } from '../../src/index.ts';
import { Resource as CResource } from '@kingdom-builder/contents';
import { createContentFactory } from '@kingdom-builder/testing';
import { createTestEngine } from '../helpers.ts';
import { resourceAmountParams } from '../helpers/resourceParams.ts';

describe('resource removal penalties', () => {
	it('reduces happiness when configured as a removal effect', () => {
		const content = createContentFactory();
		const penalty = resourceAmountParams({
			resourceId: CResource.happiness,
			amount: 1,
		});
		const action = content.action({
			effects: [
				{
					type: 'resource',
					method: 'remove',
					params: penalty,
					meta: { allowShortfall: true },
				},
			],
		});
		const engineContext = createTestEngine(content);
		advance(engineContext);
		engineContext.game.currentPlayerIndex = 0;
		// key IS the Resource ID directly
		engineContext.activePlayer.resourceValues[CResource.happiness] = 2;
		const before =
			engineContext.activePlayer.resourceValues[CResource.happiness] ?? 0;
		const cost = getActionCosts(action.id, engineContext)[CResource.ap] ?? 0;
		engineContext.activePlayer.resourceValues[CResource.ap] = cost;
		performAction(action.id, engineContext);
		const after =
			engineContext.activePlayer.resourceValues[CResource.happiness] ?? 0;
		expect(after).toBe(before - penalty.amount);
	});

	it('aggregates evaluator penalties before rounding when shortfalls are allowed', () => {
		const content = createContentFactory();
		const penalty = resourceAmountParams({
			resourceId: CResource.happiness,
			amount: 0.5,
		});
		const action = content.action({
			effects: [
				{
					// Use resource evaluator for population roles
					evaluator: {
						type: 'resource',
						params: { resourceId: CResource.council },
					},
					effects: [
						{
							type: 'resource',
							method: 'remove',
							params: penalty,
							meta: { allowShortfall: true },
						},
					],
				},
			],
		});
		const engineContext = createTestEngine({ actions: content.actions });
		advance(engineContext);
		engineContext.game.currentPlayerIndex = 0;
		// role IS the Resource ID directly
		engineContext.activePlayer.resourceValues[CResource.council] = 2;
		engineContext.activePlayer.resourceValues[CResource.happiness] = 2;
		const cost = getActionCosts(action.id, engineContext)[CResource.ap] ?? 0;

		engineContext.activePlayer.resourceValues[CResource.ap] = cost;

		const before =
			engineContext.activePlayer.resourceValues[CResource.happiness] ?? 0;
		performAction(action.id, engineContext);

		const populationCount =
			engineContext.activePlayer.resourceValues[CResource.council] ?? 0;
		const delta = penalty.change.amount * populationCount * -1;
		expect(engineContext.activePlayer.resourceValues[CResource.happiness]).toBe(
			before + delta,
		);

		engineContext.activePlayer.resourceValues[CResource.happiness] = 0;

		engineContext.activePlayer.resourceValues[CResource.ap] = cost;

		performAction(action.id, engineContext);

		const afterShortfall =
			engineContext.activePlayer.resourceValues[CResource.happiness] ?? 0;
		expect(afterShortfall).toBe(delta);
	});
});
