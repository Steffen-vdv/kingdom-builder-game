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

describe('resource:remove effect', () => {
	it('decrements a resource via action effect', () => {
		// Use isolated mode so actionCostResource returns command-points
		// (the meta-category binding resource) instead of gold from real actions
		const content = createContentFactory({ isolated: true });
		const payGold = content.action({
			id: 'pay_gold',
			name: 'Pay Gold',
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
		});
		const engineContext = createTestEngine(content);
		advance(engineContext);
		engineContext.game.currentPlayerIndex = 0;
		// Set initial gold before testing removal (isolated mode has no initial gold)
		engineContext.activePlayer.resourceValues[CResource.gold] = 10;
		const before = getResourceValue(engineContext.activePlayer, CResource.gold);
		const params = payGold.effects.find(
			(effect) =>
				effect.type === 'resource' &&
				effect.method === 'remove' &&
				effect.params?.resourceId === CResource.gold,
		)?.params as ResourceAmountParamsResult | undefined;
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
		});
		const roundDownRemove = content.action({
			id: 'round_down_remove',
			name: 'Round Down Remove',
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
		});
		const engineContext = createTestEngine(content);
		advance(engineContext);
		engineContext.game.currentPlayerIndex = 0;

		const roundUpParams = roundUpRemove.effects.find(
			(effect) =>
				effect.type === 'resource' &&
				effect.method === 'remove' &&
				effect.params?.resourceId === CResource.gold,
		)?.params as ResourcePercentParamsResult | undefined;
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

		const roundDownParams = roundDownRemove.effects.find(
			(effect) =>
				effect.type === 'resource' &&
				effect.method === 'remove' &&
				effect.params?.resourceId === CResource.gold,
		)?.params as ResourcePercentParamsResult | undefined;
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
