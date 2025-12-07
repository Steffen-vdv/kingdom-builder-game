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
} from '../helpers/resourceParams.ts';

describe('resource:add effect', () => {
	it('increments a resource via action effect', () => {
		const actions = createActionRegistry();
		actions.add('grant_gold', {
			id: 'grant_gold',
			name: 'Grant Gold',
			effects: [
				{
					type: 'resource',
					method: 'add',
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
		const actionDefinition = actions.get('grant_gold');
		const params = actionDefinition.effects.find(
			(effect) =>
				effect.type === 'resource' &&
				effect.method === 'add' &&
				effect.params?.key === CResource.gold,
		)?.params as ResourceAmountParamsResult | undefined;
		const amount = params?.amount ?? 0;
		const cost = getActionCosts('grant_gold', engineContext)[CResource.ap] ?? 0;
		engineContext.activePlayer.resourceValues[CResource.ap] = cost;
		performAction('grant_gold', engineContext);
		expect(getResourceValue(engineContext.activePlayer, CResource.gold)).toBe(
			before + amount,
		);
	});

	it('rounds fractional amounts according to round setting', () => {
		const actions = createActionRegistry();
		actions.add('round_up', {
			id: 'round_up',
			name: 'Round Up',
			effects: [
				{
					type: 'resource',
					method: 'add',
					params: resourcePercentParams({
						key: CResource.gold,
						percent: 0.24,
						roundingMode: 'up',
					}),
				},
			],
		});
		actions.add('round_down', {
			id: 'round_down',
			name: 'Round Down',
			effects: [
				{
					type: 'resource',
					method: 'add',
					params: resourcePercentParams({
						key: CResource.gold,
						percent: 0.18,
						roundingMode: 'down',
					}),
				},
			],
		});
		const engineContext = createTestEngine({ actions });
		advance(engineContext);
		engineContext.game.currentPlayerIndex = 0;

		const roundUpParams = actions
			.get('round_up')
			.effects.find(
				(effect) =>
					effect.type === 'resource' &&
					effect.method === 'add' &&
					effect.params?.key === CResource.gold,
			)?.params as ResourcePercentParamsResult | undefined;
		const roundUpBase = 5;
		engineContext.activePlayer.resourceValues[CResource.gold] = roundUpBase;
		engineContext.activePlayer.resourceValues[CResource.ap] =
			getActionCosts('round_up', engineContext)[CResource.ap] ?? 0;
		const roundUpDelta = roundUpParams?.reconciledDelta?.(roundUpBase) ?? 0;
		performAction('round_up', engineContext);
		expect(getResourceValue(engineContext.activePlayer, CResource.gold)).toBe(
			roundUpBase + roundUpDelta,
		);

		const roundDownParams = actions
			.get('round_down')
			.effects.find(
				(effect) =>
					effect.type === 'resource' &&
					effect.method === 'add' &&
					effect.params?.key === CResource.gold,
			)?.params as ResourcePercentParamsResult | undefined;
		const roundDownBase = 11;
		engineContext.activePlayer.resourceValues[CResource.gold] = roundDownBase;
		engineContext.activePlayer.resourceValues[CResource.ap] =
			getActionCosts('round_down', engineContext)[CResource.ap] ?? 0;
		const roundDownDelta =
			roundDownParams?.reconciledDelta?.(roundDownBase) ?? 0;
		performAction('round_down', engineContext);
		expect(getResourceValue(engineContext.activePlayer, CResource.gold)).toBe(
			roundDownBase + roundDownDelta,
		);
	});
});
