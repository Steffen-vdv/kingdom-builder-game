import { describe, it, expect } from 'vitest';
import {
	performAction,
	advance,
	getActionCosts,
	getResourceValue,
} from '../../src/index.ts';
import { Resource as CResource } from '@boardsmith/contents';
import { createTestEngine } from '../helpers.ts';
import { createContentFactory } from '@boardsmith/testing';
import {
	resourceAmountParams,
	resourcePercentParams,
	type ResourceAmountParamsResult,
	type ResourcePercentParamsResult,
} from '../helpers/resourceParams.ts';

// Helper to get effects from first tier
function getEffectsFromFirstTier(action: {
	tiers: Record<string, { effects: unknown[] }>;
}): unknown[] {
	const tierKeys = Object.keys(action.tiers);
	const firstTier = tierKeys.length > 0 ? tierKeys[0] : '1';
	return action.tiers[firstTier!]?.effects ?? [];
}

describe('resource:remove effect', () => {
	it('decrements a resource via action effect', () => {
		// Use isolated mode so actionCostResource returns command-points
		// (the meta-category binding resource) instead of gold from real actions
		const content = createContentFactory({ isolated: true });
		const payGold = content.action({
			id: 'pay_gold',
			name: 'Pay Gold',
			tiers: {
				'1': {
					effects: [
						{
							type: 'resource',
							method: 'remove',
							params: resourceAmountParams({
								resourceId: CResource.gold,
								amount: 3,
							}),
						},
					],
				},
			},
		});
		const engineContext = createTestEngine(content);
		advance(engineContext);
		engineContext.game.currentPlayerIndex = 0;
		// Set initial gold before testing removal (isolated mode has no initial gold)
		engineContext.activePlayer.resourceValues[CResource.gold] = 10;
		const before = getResourceValue(engineContext.activePlayer, CResource.gold);
		const effects = getEffectsFromFirstTier(payGold);
		const params = (
			effects.find(
				(effect) =>
					(effect as { type?: string }).type === 'resource' &&
					(effect as { method?: string }).method === 'remove' &&
					(effect as { params?: { resourceId?: string } }).params
						?.resourceId === CResource.gold,
			) as { params?: ResourceAmountParamsResult }
		)?.params;
		const amount = params?.amount ?? 0;
		const cost = getActionCosts('pay_gold', engineContext)[CResource.cp] ?? 0;
		engineContext.activePlayer.resourceValues[CResource.cp] = cost;
		performAction('pay_gold', engineContext);
		expect(getResourceValue(engineContext.activePlayer, CResource.gold)).toBe(
			before - amount,
		);
	});

	it('rounds fractional amounts according to round setting', () => {
		// Use isolated mode so actionCostResource returns command-points
		const content = createContentFactory({ isolated: true });
		const roundUpRemove = content.action({
			id: 'round_up_remove',
			name: 'Round Up Remove',
			tiers: {
				'1': {
					effects: [
						{
							type: 'resource',
							method: 'remove',
							params: resourcePercentParams({
								resourceId: CResource.gold,
								percent: 0.26,
								roundingMode: 'up',
							}),
						},
					],
				},
			},
		});
		const roundDownRemove = content.action({
			id: 'round_down_remove',
			name: 'Round Down Remove',
			tiers: {
				'1': {
					effects: [
						{
							type: 'resource',
							method: 'remove',
							params: resourcePercentParams({
								resourceId: CResource.gold,
								percent: 0.36,
								roundingMode: 'down',
							}),
						},
					],
				},
			},
		});
		const engineContext = createTestEngine(content);
		advance(engineContext);
		engineContext.game.currentPlayerIndex = 0;

		const roundUpEffects = getEffectsFromFirstTier(roundUpRemove);
		const roundUpParams = (
			roundUpEffects.find(
				(effect) =>
					(effect as { type?: string }).type === 'resource' &&
					(effect as { method?: string }).method === 'remove' &&
					(effect as { params?: { resourceId?: string } }).params
						?.resourceId === CResource.gold,
			) as { params?: ResourcePercentParamsResult }
		)?.params;
		const roundUpBase = 7;
		engineContext.activePlayer.resourceValues[CResource.gold] = roundUpBase;
		engineContext.activePlayer.resourceValues[CResource.cp] =
			getActionCosts('round_up_remove', engineContext)[CResource.cp] ?? 0;
		const roundUpDelta =
			roundUpParams?.reconciledDelta?.(roundUpBase, 'remove') ?? 0;
		performAction('round_up_remove', engineContext);
		expect(getResourceValue(engineContext.activePlayer, CResource.gold)).toBe(
			roundUpBase + roundUpDelta,
		);

		const roundDownEffects = getEffectsFromFirstTier(roundDownRemove);
		const roundDownParams = (
			roundDownEffects.find(
				(effect) =>
					(effect as { type?: string }).type === 'resource' &&
					(effect as { method?: string }).method === 'remove' &&
					(effect as { params?: { resourceId?: string } }).params
						?.resourceId === CResource.gold,
			) as { params?: ResourcePercentParamsResult }
		)?.params;
		const roundDownBase = 9;
		engineContext.activePlayer.resourceValues[CResource.gold] = roundDownBase;
		engineContext.activePlayer.resourceValues[CResource.cp] =
			getActionCosts('round_down_remove', engineContext)[CResource.cp] ?? 0;
		const roundDownDelta =
			roundDownParams?.reconciledDelta?.(roundDownBase, 'remove') ?? 0;
		performAction('round_down_remove', engineContext);
		expect(getResourceValue(engineContext.activePlayer, CResource.gold)).toBe(
			roundDownBase + roundDownDelta,
		);
	});
});
