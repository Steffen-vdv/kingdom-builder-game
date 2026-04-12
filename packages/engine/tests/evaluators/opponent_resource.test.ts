import { describe, it, expect } from 'vitest';
import { opponentResourceEvaluator } from '../../src/evaluators/opponent_resource';
import { createTestEngine } from '../helpers';

describe('opponent-resource evaluator', () => {
	it('returns the opponent resource value', () => {
		const context = createTestEngine({ skipInitialSetup: true });
		context.opponent.resourceValues['resource:core:gold'] = 42;
		const result = opponentResourceEvaluator(
			{
				type: 'opponent-resource',
				params: { resourceId: 'resource:core:gold' },
			},
			context,
		);
		expect(result).toBe(42);
	});

	it('returns 0 for an unset resource', () => {
		const context = createTestEngine({ skipInitialSetup: true });
		const result = opponentResourceEvaluator(
			{
				type: 'opponent-resource',
				params: { resourceId: 'nonexistent' },
			},
			context,
		);
		expect(result).toBe(0);
	});
});
