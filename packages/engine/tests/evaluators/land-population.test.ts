import { describe, expect, it } from 'vitest';
import { landEvaluator } from '../../src/evaluators/land.ts';
import { populationEvaluator } from '../../src/evaluators/population.ts';
import { createTestEngine } from '../helpers.ts';
import { Land } from '../../src/state';

describe('evaluators', () => {
	it('counts total available land slots with negative usage guarded', () => {
		const context = createTestEngine();
		context.activePlayer.lands.length = 0;
		const fertile = new Land(`${context.activePlayer.id}-fertile`, 3, true);
		fertile.slotsUsed = 1;
		const depleted = new Land(`${context.activePlayer.id}-depleted`, 2, false);
		depleted.slotsUsed = 5;
		context.activePlayer.lands.push(fertile, depleted);
		const total = landEvaluator({ params: {} } as never, context);
		expect(total).toBe(2);
	});

	it('totals population counts and filters by role when provided', () => {
		const context = createTestEngine();
		const roleIds = Object.keys(context.activePlayer.population);
		const focusRole = roleIds[0]!;
		const secondaryRole = roleIds.find((entry) => entry !== focusRole);
		context.activePlayer.population[focusRole] = 3;
		if (secondaryRole) {
			context.activePlayer.population[secondaryRole] = 2;
		}
		const total = populationEvaluator({ params: {} } as never, context);
		expect(total).toBe(secondaryRole ? 5 : 3);
		const targeted = populationEvaluator(
			{ params: { role: focusRole } } as never,
			context,
		);
		expect(targeted).toBe(3);
		const missingRole = `${focusRole}-missing`;
		const missingTotal = populationEvaluator(
			{ params: { role: missingRole } } as never,
			context,
		);
		expect(missingTotal).toBe(0);
	});
});
