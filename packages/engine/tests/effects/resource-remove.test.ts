import { describe, it, expect } from 'vitest';
import {
	performAction,
	advance,
	getActionCosts,
	getResourceValue,
} from '../../src/index.ts';
import {
	createActionRegistry,
	Resource as CResource,
} from '@kingdom-builder/contents';
import { createTestEngine } from '../helpers.ts';
import {
	resourceAmountParams,
	resourcePercentParams,
	type ResourceAmountParamsResult,
	type ResourcePercentParamsResult,
} from '../helpers/resourceV2Params.ts';

describe('resource:remove effect', () => {
	it('decrements a resource via action effect', () => {
		const actions = createActionRegistry();
		actions.add('pay_gold', {
			id: 'pay_gold',
			name: 'Pay Gold',
			effects: [
				{
					type: 'resource',
					method: 'remove',
					params: resourceAmountParams({
						key: CResource.gold,
						amount: 3,
					}),
				},
			],
		});
		const engineContext = createTestEngine({ actions });
		advance(engineContext);
		engineContext.game.currentPlayerIndex = 0;
		const before = getResourceValue(engineContext.activePlayer, CResource.gold);
		const actionDefinition = actions.get('pay_gold');
		const params = actionDefinition.effects.find(
			(effect) =>
				effect.type === 'resource' &&
				effect.method === 'remove' &&
				effect.params?.key === CResource.gold,
		)?.params as ResourceAmountParamsResult | undefined;
		const amount = params?.amount ?? 0;
		const cost = getActionCosts('pay_gold', engineContext)[CResource.ap] ?? 0;
		engineContext.activePlayer.resourceValues[CResource.ap] = cost;
		performAction('pay_gold', engineContext);
		expect(getResourceValue(engineContext.activePlayer, CResource.gold)).toBe(
			before - amount,
		);
	});

	it('rounds fractional amounts according to round setting', () => {
		const actions = createActionRegistry();
		actions.add('round_up_remove', {
			id: 'round_up_remove',
			name: 'Round Up Remove',
			effects: [
				{
					type: 'resource',
					method: 'remove',
					params: resourcePercentParams({
						key: CResource.gold,
						percent: 0.26,
						roundingMode: 'up',
					}),
				},
			],
		});
		actions.add('round_down_remove', {
			id: 'round_down_remove',
			name: 'Round Down Remove',
			effects: [
				{
					type: 'resource',
					method: 'remove',
					params: resourcePercentParams({
						key: CResource.gold,
						percent: 0.36,
						roundingMode: 'down',
					}),
				},
			],
		});
		const engineContext = createTestEngine({ actions });
		advance(engineContext);
		engineContext.game.currentPlayerIndex = 0;

		const roundUpParams = actions
			.get('round_up_remove')
			.effects.find(
				(effect) =>
					effect.type === 'resource' &&
					effect.method === 'remove' &&
					effect.params?.key === CResource.gold,
			)?.params as ResourcePercentParamsResult | undefined;
		const roundUpBase = 7;
		engineContext.activePlayer.resourceValues[CResource.gold] = roundUpBase;
		engineContext.activePlayer.resourceValues[CResource.ap] =
			getActionCosts('round_up_remove', engineContext)[CResource.ap] ?? 0;
		const roundUpDelta =
			roundUpParams?.reconciledDelta?.(roundUpBase, 'remove') ?? 0;
		performAction('round_up_remove', engineContext);
		expect(getResourceValue(engineContext.activePlayer, CResource.gold)).toBe(
			roundUpBase + roundUpDelta,
		);

		const roundDownParams = actions
			.get('round_down_remove')
			.effects.find(
				(effect) =>
					effect.type === 'resource' &&
					effect.method === 'remove' &&
					effect.params?.key === CResource.gold,
			)?.params as ResourcePercentParamsResult | undefined;
		const roundDownBase = 9;
		engineContext.activePlayer.resourceValues[CResource.gold] = roundDownBase;
		engineContext.activePlayer.resourceValues[CResource.ap] =
			getActionCosts('round_down_remove', engineContext)[CResource.ap] ?? 0;
		const roundDownDelta =
			roundDownParams?.reconciledDelta?.(roundDownBase, 'remove') ?? 0;
		performAction('round_down_remove', engineContext);
		expect(getResourceValue(engineContext.activePlayer, CResource.gold)).toBe(
			roundDownBase + roundDownDelta,
		);
	});
});
