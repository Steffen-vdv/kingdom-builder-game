import { describe, expect, it } from 'vitest';
import { landEvaluator } from '../../src/evaluators/land.ts';
import { resourceEvaluator } from '../../src/evaluators/resource.ts';
import { createTestEngine } from '../helpers.ts';
import { Land } from '../../src/state';
import { Resource } from '@kingdom-builder/contents';
import { setResourceValue } from '../../src/resource';

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

	it('totals population via parent resource and filters by role when provided', () => {
		const context = createTestEngine();
		// Get population role IDs from contents
		const focusRole = Resource.council;
		const secondaryRole = Resource.legion;
		// First raise max-population to allow for 5 total population
		// (population total is dynamically bounded by max-population)
		setResourceValue(
			context,
			context.activePlayer,
			context.resourceCatalog,
			Resource.populationMax,
			10,
		);
		// Use setResourceValue to properly trigger parent recalculation
		setResourceValue(
			context,
			context.activePlayer,
			context.resourceCatalog,
			focusRole,
			3,
		);
		if (secondaryRole) {
			setResourceValue(
				context,
				context.activePlayer,
				context.resourceCatalog,
				secondaryRole,
				2,
			);
		}
		// Total population uses parent resource that auto-sums children
		const total = resourceEvaluator(
			{ params: { resourceId: Resource.populationTotal } } as never,
			context,
		);
		expect(total).toBe(secondaryRole ? 5 : 3);
		// Individual role lookup
		const targeted = resourceEvaluator(
			{ params: { resourceId: focusRole } } as never,
			context,
		);
		expect(targeted).toBe(3);
		// Missing role returns 0
		const missingRole = `${focusRole}-missing`;
		const missingTotal = resourceEvaluator(
			{ params: { resourceId: missingRole } } as never,
			context,
		);
		expect(missingTotal).toBe(0);
	});
});
