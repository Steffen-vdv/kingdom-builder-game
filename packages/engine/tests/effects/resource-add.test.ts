import { describe, it, expect } from 'vitest';
import {
	performAction,
	advance,
	getActionCosts,
	getResourceValue,
} from '../../src/index.ts';
import { Resource as CResource } from '@kingdom-builder/contents';
import { createTestEngine } from '../helpers.ts';
import { createContentFactory } from '@kingdom-builder/testing';
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

describe('resource:add effect', () => {
	it('increments a resource via action effect', () => {
		// Use isolated mode so actionCostResource returns command-points
		// (the meta-category binding resource) instead of gold from real actions
		const content = createContentFactory({ isolated: true });
		const grantGold = content.action({
			id: 'grant_gold',
			name: 'Grant Gold',
			tiers: {
				'1': {
					effects: [
						{
							type: 'resource',
							method: 'add',
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
		const before = getResourceValue(engineContext.activePlayer, CResource.gold);
		const effects = getEffectsFromFirstTier(grantGold);
		const params = (
			effects.find(
				(effect) =>
					(effect as { type?: string }).type === 'resource' &&
					(effect as { method?: string }).method === 'add' &&
					(effect as { params?: { resourceId?: string } }).params
						?.resourceId === CResource.gold,
			) as { params?: ResourceAmountParamsResult }
		)?.params;
		const amount = params?.amount ?? 0;
		const cost = getActionCosts('grant_gold', engineContext)[CResource.cp] ?? 0;
		engineContext.activePlayer.resourceValues[CResource.cp] = cost;
		performAction('grant_gold', engineContext);
		expect(getResourceValue(engineContext.activePlayer, CResource.gold)).toBe(
			before + amount,
		);
	});

	it('rounds fractional amounts according to round setting', () => {
		// Use isolated mode so actionCostResource returns command-points
		const content = createContentFactory({ isolated: true });
		const roundUp = content.action({
			id: 'round_up',
			name: 'Round Up',
			tiers: {
				'1': {
					effects: [
						{
							type: 'resource',
							method: 'add',
							params: resourcePercentParams({
								resourceId: CResource.gold,
								percent: 0.24,
								roundingMode: 'up',
							}),
						},
					],
				},
			},
		});
		const roundDown = content.action({
			id: 'round_down',
			name: 'Round Down',
			tiers: {
				'1': {
					effects: [
						{
							type: 'resource',
							method: 'add',
							params: resourcePercentParams({
								resourceId: CResource.gold,
								percent: 0.18,
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

		const roundUpEffects = getEffectsFromFirstTier(roundUp);
		const roundUpParams = (
			roundUpEffects.find(
				(effect) =>
					(effect as { type?: string }).type === 'resource' &&
					(effect as { method?: string }).method === 'add' &&
					(effect as { params?: { resourceId?: string } }).params
						?.resourceId === CResource.gold,
			) as { params?: ResourcePercentParamsResult }
		)?.params;
		const roundUpBase = 5;
		engineContext.activePlayer.resourceValues[CResource.gold] = roundUpBase;
		engineContext.activePlayer.resourceValues[CResource.cp] =
			getActionCosts('round_up', engineContext)[CResource.cp] ?? 0;
		const roundUpDelta = roundUpParams?.reconciledDelta?.(roundUpBase) ?? 0;
		performAction('round_up', engineContext);
		expect(getResourceValue(engineContext.activePlayer, CResource.gold)).toBe(
			roundUpBase + roundUpDelta,
		);

		const roundDownEffects = getEffectsFromFirstTier(roundDown);
		const roundDownParams = (
			roundDownEffects.find(
				(effect) =>
					(effect as { type?: string }).type === 'resource' &&
					(effect as { method?: string }).method === 'add' &&
					(effect as { params?: { resourceId?: string } }).params
						?.resourceId === CResource.gold,
			) as { params?: ResourcePercentParamsResult }
		)?.params;
		const roundDownBase = 11;
		engineContext.activePlayer.resourceValues[CResource.gold] = roundDownBase;
		engineContext.activePlayer.resourceValues[CResource.cp] =
			getActionCosts('round_down', engineContext)[CResource.cp] ?? 0;
		const roundDownDelta =
			roundDownParams?.reconciledDelta?.(roundDownBase) ?? 0;
		performAction('round_down', engineContext);
		expect(getResourceValue(engineContext.activePlayer, CResource.gold)).toBe(
			roundDownBase + roundDownDelta,
		);
	});
});
