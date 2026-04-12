import { describe, it, expect } from 'vitest';
import { createTestEngine } from '../helpers';
import { runEffects } from '../../src/effects';
import type { EffectDef } from '@kingdom-builder/protocol';

function makeBranchEffect(
	operator: string,
	threshold: number,
	resourceValue: number,
): { effect: EffectDef; context: ReturnType<typeof createTestEngine> } {
	const context = createTestEngine({
		skipInitialSetup: true,
	});
	context.activePlayer.resourceValues['resource:core:gold'] = resourceValue;
	const effect: EffectDef = {
		type: 'conditional',
		method: 'branch',
		params: {
			evaluator: {
				type: 'resource',
				params: { resourceId: 'resource:core:gold' },
			},
			operator,
			threshold,
			thenEffects: [
				{
					type: 'resource',
					method: 'add',
					params: {
						resourceId: 'resource:core:gold',
						change: { type: 'amount', amount: 100 },
					},
				},
			],
		},
	};
	return { effect, context };
}

describe('conditional:branch operators', () => {
	it('gte: true when equal', () => {
		const { effect, context } = makeBranchEffect('gte', 5, 5);
		runEffects([effect], context);
		expect(context.activePlayer.resourceValues['resource:core:gold']).toBe(105);
	});

	it('lt: true when less', () => {
		const { effect, context } = makeBranchEffect('lt', 10, 3);
		runEffects([effect], context);
		expect(context.activePlayer.resourceValues['resource:core:gold']).toBe(103);
	});

	it('lte: true when equal', () => {
		const { effect, context } = makeBranchEffect('lte', 5, 5);
		runEffects([effect], context);
		expect(context.activePlayer.resourceValues['resource:core:gold']).toBe(105);
	});

	it('eq: true when equal', () => {
		const { effect, context } = makeBranchEffect('eq', 7, 7);
		runEffects([effect], context);
		expect(context.activePlayer.resourceValues['resource:core:gold']).toBe(107);
	});

	it('ne: true when not equal', () => {
		const { effect, context } = makeBranchEffect('ne', 7, 3);
		runEffects([effect], context);
		expect(context.activePlayer.resourceValues['resource:core:gold']).toBe(103);
	});

	it('ne: false when equal', () => {
		const { effect, context } = makeBranchEffect('ne', 3, 3);
		runEffects([effect], context);
		expect(context.activePlayer.resourceValues['resource:core:gold']).toBe(3);
	});
});
