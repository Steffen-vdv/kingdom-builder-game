import { describe, it, expect } from 'vitest';
import { buildingEvaluator } from '../../src/evaluators/building';
import { createTestEngine } from '../helpers';

describe('building evaluator', () => {
	it('returns 0 when the player has no buildings', () => {
		const context = createTestEngine({ skipInitialSetup: true });
		const result = buildingEvaluator({ type: 'building' }, context);
		expect(result).toBe(0);
	});

	it('counts all buildings when no id is provided', () => {
		const context = createTestEngine({ skipInitialSetup: true });
		context.activePlayer.buildings.add('mill');
		context.activePlayer.buildings.add('barracks');
		context.activePlayer.buildings.add('temple');
		const result = buildingEvaluator({ type: 'building' }, context);
		expect(result).toBe(3);
	});

	it('returns 1 when the player has the specified building', () => {
		const context = createTestEngine({ skipInitialSetup: true });
		context.activePlayer.buildings.add('mill');
		const result = buildingEvaluator(
			{ type: 'building', params: { id: 'mill' } },
			context,
		);
		expect(result).toBe(1);
	});

	it('returns 0 when the player lacks the specified building', () => {
		const context = createTestEngine({ skipInitialSetup: true });
		context.activePlayer.buildings.add('barracks');
		const result = buildingEvaluator(
			{ type: 'building', params: { id: 'mill' } },
			context,
		);
		expect(result).toBe(0);
	});
});
