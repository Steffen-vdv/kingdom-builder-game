import { describe, it, expect } from 'vitest';
import { runEffects, getActionCosts } from '../src';
import { setupHappinessThresholdTest } from './happiness-thresholds.setup';

describe('Happiness thresholds', () => {
	it('swaps tier passives and updates skip markers', () => {
		const {
			ctx,
			tierKey,
			phaseId,
			stepId,
			lowTierId,
			highTierId,
			lowPassiveId,
			highPassiveId,
		} = setupHappinessThresholdTest();
		const player = ctx.activePlayer;

		expect(ctx.passives.list(player.id)).toContain(lowPassiveId);
		expect(player.happinessTierId).toBe(lowTierId);
		expect(player.skipPhases[phaseId]).toBeUndefined();

		runEffects(
			[
				{
					type: 'resource',
					method: 'add',
					params: { key: tierKey, amount: 3 },
				},
			],
			ctx,
		);

		expect(ctx.passives.list(player.id)).toContain(highPassiveId);
		expect(ctx.passives.list(player.id)).not.toContain(lowPassiveId);
		expect(player.happinessTierId).toBe(highTierId);
		expect(player.skipPhases[phaseId]).toBe(1);
		expect(player.skipSteps[phaseId]?.[stepId]).toBe(1);

		runEffects(
			[
				{
					type: 'resource',
					method: 'remove',
					params: { key: tierKey, amount: 3 },
				},
			],
			ctx,
		);

		expect(ctx.passives.list(player.id)).toContain(lowPassiveId);
		expect(ctx.passives.list(player.id)).not.toContain(highPassiveId);
		expect(player.happinessTierId).toBe(lowTierId);
		expect(player.skipPhases[phaseId]).toBeUndefined();
		expect(player.skipSteps[phaseId]).toBeUndefined();
	});

	it('applies percent modifiers from tier passives additively', () => {
		const { ctx, action, tierKey } = setupHappinessThresholdTest();
		ctx.passives.registerCostModifier('manual', () => ({
			percent: { [tierKey]: 0.1 },
		}));

		const baseCost = getActionCosts(action.id, ctx);
		expect(baseCost[tierKey]).toBeCloseTo(10 * (1 + 0.1));

		runEffects(
			[
				{
					type: 'resource',
					method: 'add',
					params: { key: tierKey, amount: 3 },
				},
			],
			ctx,
		);

		const discounted = getActionCosts(action.id, ctx);
		expect(discounted[tierKey]).toBeCloseTo(10 * (1 + 0.1 - 0.2));

		runEffects(
			[
				{
					type: 'resource',
					method: 'remove',
					params: { key: tierKey, amount: 3 },
				},
			],
			ctx,
		);

		const reset = getActionCosts(action.id, ctx);
		expect(reset[tierKey]).toBeCloseTo(10 * (1 + 0.1));
	});

	it('provides metadata for the active tier passive', () => {
		const { ctx, tierKey, lowPassiveId, highPassiveId, lowTierId, highTierId } =
			setupHappinessThresholdTest();
		const player = ctx.activePlayer;

		const initialPassive = ctx.passives
			.values(player.id)
			.find((passive) => passive.id === lowPassiveId);
		expect(initialPassive?.meta?.source?.id).toBe(lowTierId);
		expect(initialPassive?.meta?.removal?.text).toBe('token.low.removal');

		runEffects(
			[
				{
					type: 'resource',
					method: 'add',
					params: { key: tierKey, amount: 3 },
				},
			],
			ctx,
		);

		const upgradedPassive = ctx.passives
			.values(player.id)
			.find((passive) => passive.id === highPassiveId);
		expect(upgradedPassive?.meta?.source?.id).toBe(highTierId);
		expect(upgradedPassive?.meta?.removal?.condition).toBe(
			'token.high.removalCondition',
		);
		expect(upgradedPassive?.meta?.text?.summary).toBe('token.high.summary');
	});
});
