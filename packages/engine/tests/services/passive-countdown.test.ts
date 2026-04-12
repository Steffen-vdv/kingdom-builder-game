import { describe, it, expect } from 'vitest';
import { createTestEngine } from '../helpers';
import { runEffects } from '../../src/effects';
import type { EffectDef } from '@kingdom-builder/protocol';

describe('passive turn countdown', () => {
	it('decrements turnsRemaining each tick', () => {
		const context = createTestEngine({
			skipInitialSetup: true,
		});
		const passiveEffect: EffectDef = {
			type: 'passive',
			method: 'add',
			params: {
				id: 'test-countdown',
				name: 'Test Countdown',
				turnsRemaining: 3,
			},
			effects: [
				{
					type: 'resource',
					method: 'add',
					params: {
						resourceId: 'resource:core:gold',
						change: { type: 'amount', amount: 5 },
					},
				},
			],
		};
		runEffects([passiveEffect], context);
		const passive = context.passives.get(
			'test-countdown',
			context.activePlayer.id,
		);
		expect(passive).toBeDefined();
		expect(passive!.turnsRemaining).toBe(3);

		context.passives.tickPassiveDurations(context);
		expect(passive!.turnsRemaining).toBe(2);

		context.passives.tickPassiveDurations(context);
		expect(passive!.turnsRemaining).toBe(1);
	});

	it('removes the passive when turnsRemaining reaches 0', () => {
		const context = createTestEngine({
			skipInitialSetup: true,
		});
		const passiveEffect: EffectDef = {
			type: 'passive',
			method: 'add',
			params: {
				id: 'expiring-passive',
				name: 'Expiring',
				turnsRemaining: 1,
			},
			effects: [
				{
					type: 'resource',
					method: 'add',
					params: {
						resourceId: 'resource:core:gold',
						change: { type: 'amount', amount: 10 },
					},
				},
			],
		};
		runEffects([passiveEffect], context);
		expect(
			context.passives.get('expiring-passive', context.activePlayer.id),
		).toBeDefined();

		context.passives.tickPassiveDurations(context);
		expect(
			context.passives.get('expiring-passive', context.activePlayer.id),
		).toBeUndefined();
	});

	it('does not affect passives without turnsRemaining', () => {
		const context = createTestEngine({
			skipInitialSetup: true,
		});
		const permanentPassive: EffectDef = {
			type: 'passive',
			method: 'add',
			params: {
				id: 'permanent-passive',
				name: 'Permanent',
			},
			effects: [
				{
					type: 'resource',
					method: 'add',
					params: {
						resourceId: 'resource:core:gold',
						change: { type: 'amount', amount: 5 },
					},
				},
			],
		};
		runEffects([permanentPassive], context);

		context.passives.tickPassiveDurations(context);
		context.passives.tickPassiveDurations(context);
		context.passives.tickPassiveDurations(context);

		expect(
			context.passives.get('permanent-passive', context.activePlayer.id),
		).toBeDefined();
	});
});
