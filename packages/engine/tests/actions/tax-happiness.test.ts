import { describe, it, expect } from 'vitest';
import { performAction, advance, getActionCosts } from '../../src/index.ts';
import { Resource, PopulationRole } from '@kingdom-builder/contents';
import { createContentFactory } from '@kingdom-builder/testing';
import { createTestEngine } from '../helpers.ts';

describe('resource removal penalties', () => {
	it('reduces happiness when configured as a removal effect', () => {
		const content = createContentFactory();
		const action = content.action({
			effects: [
				{
					type: 'resource',
					method: 'remove',
					params: { key: Resource.happiness, amount: 1 },
					meta: { allowShortfall: true },
				},
			],
		});
		const engineContext = createTestEngine(content);
		advance(engineContext);
		engineContext.game.currentPlayerIndex = 0;
		engineContext.activePlayer.resources[Resource.happiness] = 2;
		const before =
			engineContext.activePlayer.resources[Resource.happiness] ?? 0;
		const cost = getActionCosts(action.id, engineContext)[Resource.ap] ?? 0;
		engineContext.activePlayer.ap = cost;
		performAction(action.id, engineContext);
		const after = engineContext.activePlayer.resources[Resource.happiness] ?? 0;
		expect(after).toBe(before - 1);
	});

	it('aggregates evaluator penalties before rounding when shortfalls are allowed', () => {
		const content = createContentFactory();
		const action = content.action({
			effects: [
				{
					evaluator: {
						type: 'population',
						params: { role: PopulationRole.Council },
					},
					effects: [
						{
							type: 'resource',
							method: 'remove',
							round: 'up',
							params: { key: Resource.happiness, amount: 0.5 },
							meta: { allowShortfall: true },
						},
					],
				},
			],
		});
		const engineContext = createTestEngine({ actions: content.actions });
		advance(engineContext);
		engineContext.game.currentPlayerIndex = 0;
		engineContext.activePlayer.population[PopulationRole.Council] = 2;
		engineContext.activePlayer.resources[Resource.happiness] = 2;
		const cost = getActionCosts(action.id, engineContext)[Resource.ap] ?? 0;

		engineContext.activePlayer.ap = cost;

		performAction(action.id, engineContext);

		expect(engineContext.activePlayer.resources[Resource.happiness]).toBe(1);

		engineContext.activePlayer.resources[Resource.happiness] = 0;

		engineContext.activePlayer.ap = cost;

		performAction(action.id, engineContext);

		expect(engineContext.activePlayer.resources[Resource.happiness]).toBe(-1);
	});
});
