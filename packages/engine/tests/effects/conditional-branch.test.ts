import { describe, it, expect } from 'vitest';
import { createTestEngine } from '../helpers';
import { runEffects } from '../../src/effects';
import type { EffectDef } from '@boardsmith/protocol';

describe('conditional:branch effect', () => {
	it('runs thenEffects when condition is true', () => {
		const context = createTestEngine({
			skipInitialSetup: true,
		});
		context.activePlayer.resourceValues['resource:core:gold'] = 10;

		const effect: EffectDef = {
			type: 'conditional',
			method: 'branch',
			params: {
				evaluator: {
					type: 'resource',
					params: {
						resourceId: 'resource:core:gold',
					},
				},
				operator: 'gt',
				threshold: 5,
				thenEffects: [
					{
						type: 'resource',
						method: 'add',
						params: {
							resourceId: 'resource:core:gold',
							change: { type: 'amount', amount: 3 },
						},
					},
				],
			},
		};

		runEffects([effect], context);
		expect(context.activePlayer.resourceValues['resource:core:gold']).toBe(13);
	});

	it('runs elseEffects when condition is false', () => {
		const context = createTestEngine({
			skipInitialSetup: true,
		});
		context.activePlayer.resourceValues['resource:core:gold'] = 2;

		const effect: EffectDef = {
			type: 'conditional',
			method: 'branch',
			params: {
				evaluator: {
					type: 'resource',
					params: {
						resourceId: 'resource:core:gold',
					},
				},
				operator: 'gt',
				threshold: 5,
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
				elseEffects: [
					{
						type: 'resource',
						method: 'add',
						params: {
							resourceId: 'resource:core:gold',
							change: { type: 'amount', amount: 1 },
						},
					},
				],
			},
		};

		runEffects([effect], context);
		expect(context.activePlayer.resourceValues['resource:core:gold']).toBe(3);
	});

	it('does nothing when condition is false and no elseEffects', () => {
		const context = createTestEngine({
			skipInitialSetup: true,
		});
		context.activePlayer.resourceValues['resource:core:gold'] = 2;

		const effect: EffectDef = {
			type: 'conditional',
			method: 'branch',
			params: {
				evaluator: {
					type: 'resource',
					params: {
						resourceId: 'resource:core:gold',
					},
				},
				operator: 'gt',
				threshold: 5,
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

		runEffects([effect], context);
		expect(context.activePlayer.resourceValues['resource:core:gold']).toBe(2);
	});
});
