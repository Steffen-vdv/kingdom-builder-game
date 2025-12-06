import { describe, expect, it } from 'vitest';
import { landEvaluator } from '../../src/evaluators/land.ts';
import { populationEvaluator } from '../../src/evaluators/population.ts';
import { createTestEngine } from '../helpers.ts';
import { Land } from '../../src/state';
import { PopulationRole } from '@kingdom-builder/contents';

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
		// Get population role IDs from contents (not by parsing resourceValues keys)
		const roleIds = Object.values(PopulationRole);
		const focusRole = roleIds[0]!;
		const secondaryRole = roleIds.find((entry) => entry !== focusRole);
		// Population values accessed via resourceValues
		context.activePlayer.resourceValues[focusRole] = 3;
		if (secondaryRole) {
			context.activePlayer.resourceValues[secondaryRole] = 2;
		}
		const total = populationEvaluator({ params: {} } as never, context);
		expect(total).toBe(secondaryRole ? 5 : 3);
		const targeted = populationEvaluator(
			{ params: { resourceId: focusRole } } as never,
			context,
		);
		expect(targeted).toBe(3);
		const missingRole = `${focusRole}-missing`;
		const missingTotal = populationEvaluator(
			{ params: { resourceId: missingRole } } as never,
			context,
		);
		expect(missingTotal).toBe(0);
	});
});
