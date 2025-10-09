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
		const ctx = createTestEngine(content);
		advance(ctx);
		ctx.game.currentPlayerIndex = 0;
		ctx.activePlayer.resources[Resource.happiness] = 2;
		const before = ctx.activePlayer.resources[Resource.happiness] ?? 0;
		const cost = getActionCosts(action.id, ctx)[Resource.ap] ?? 0;
		ctx.activePlayer.ap = cost;
		performAction(action.id, ctx);
		const after = ctx.activePlayer.resources[Resource.happiness] ?? 0;
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
		const ctx = createTestEngine({ actions: content.actions });
		advance(ctx);
		ctx.game.currentPlayerIndex = 0;
		ctx.activePlayer.population[PopulationRole.Council] = 2;
		ctx.activePlayer.resources[Resource.happiness] = 2;
		const cost = getActionCosts(action.id, ctx)[Resource.ap] ?? 0;

		ctx.activePlayer.ap = cost;

		performAction(action.id, ctx);

		expect(ctx.activePlayer.resources[Resource.happiness]).toBe(1);

		ctx.activePlayer.resources[Resource.happiness] = 0;

		ctx.activePlayer.ap = cost;

		performAction(action.id, ctx);

		expect(ctx.activePlayer.resources[Resource.happiness]).toBe(-1);
	});
});
