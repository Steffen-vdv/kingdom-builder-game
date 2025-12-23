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

describe('resource:add effect', () => {
	it('increments a resource via action effect', () => {
		// Use isolated mode so actionCostResource returns command-points
		// (the meta-category binding resource) instead of gold from real actions
		const content = createContentFactory({ isolated: true });
		const grantGold = content.action({
			id: 'grant_gold',
			name: 'Grant Gold',
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
		});
		const engineContext = createTestEngine(content);
		advance(engineContext);
		engineContext.game.currentPlayerIndex = 0;
		const before = getResourceValue(engineContext.activePlayer, CResource.gold);
		const params = grantGold.effects.find(
			(effect) =>
				effect.type === 'resource' &&
				effect.method === 'add' &&
				effect.params?.resourceId === CResource.gold,
		)?.params as ResourceAmountParamsResult | undefined;
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
		});
		const roundDown = content.action({
			id: 'round_down',
			name: 'Round Down',
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
		});
		const engineContext = createTestEngine(content);
		advance(engineContext);
		engineContext.game.currentPlayerIndex = 0;

		const roundUpParams = roundUp.effects.find(
			(effect) =>
				effect.type === 'resource' &&
				effect.method === 'add' &&
				effect.params?.resourceId === CResource.gold,
		)?.params as ResourcePercentParamsResult | undefined;
		const roundUpBase = 5;
		engineContext.activePlayer.resourceValues[CResource.gold] = roundUpBase;
		engineContext.activePlayer.resourceValues[CResource.cp] =
			getActionCosts('round_up', engineContext)[CResource.cp] ?? 0;
		const roundUpDelta = roundUpParams?.reconciledDelta?.(roundUpBase) ?? 0;
		performAction('round_up', engineContext);
		expect(getResourceValue(engineContext.activePlayer, CResource.gold)).toBe(
			roundUpBase + roundUpDelta,
		);

		const roundDownParams = roundDown.effects.find(
			(effect) =>
				effect.type === 'resource' &&
				effect.method === 'add' &&
				effect.params?.resourceId === CResource.gold,
		)?.params as ResourcePercentParamsResult | undefined;
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
