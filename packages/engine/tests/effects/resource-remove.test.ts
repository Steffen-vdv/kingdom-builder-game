import { describe, it, expect } from 'vitest';
import {
	performAction,
	Resource,
	advance,
	getActionCosts,
} from '../../src/index.ts';
import {
	createActionRegistry,
	Resource as CResource,
} from '@kingdom-builder/contents';
import { createTestEngine } from '../helpers.ts';
import {
	resourceAmountParams,
	resourcePercentParams,
} from '../helpers/resourceV2Params.ts';

describe('resource:remove effect', () => {
	it('decrements a resource via action effect', () => {
		const actions = createActionRegistry();
		const params = resourceAmountParams(CResource.gold, 3);
		actions.add('pay_gold', {
			id: 'pay_gold',
			name: 'Pay Gold',
			effects: [
				{
					type: 'resource',
					method: 'remove',
					params,
				},
			],
		});
		const engineContext = createTestEngine({ actions });
		advance(engineContext);
		engineContext.game.currentPlayerIndex = 0;
		const before = engineContext.activePlayer.gold;
		const amount = params.amount;
		const cost = getActionCosts('pay_gold', engineContext)[Resource.ap] ?? 0;
		engineContext.activePlayer.ap = cost;
		performAction('pay_gold', engineContext);
		expect(engineContext.activePlayer.gold).toBe(before - amount);
	});

	it('rounds fractional amounts according to round setting', () => {
		const actions = createActionRegistry();
		const roundUpParams = resourcePercentParams(CResource.gold, 0.12, {
			roundingMode: 'up',
		});
		actions.add('round_up_remove', {
			id: 'round_up_remove',
			name: 'Round Up Remove',
			effects: [
				{
					type: 'resource',
					method: 'remove',
					params: roundUpParams,
				},
			],
		});
		const roundDownParams = resourcePercentParams(CResource.gold, 0.18, {
			roundingMode: 'down',
		});
		actions.add('round_down_remove', {
			id: 'round_down_remove',
			name: 'Round Down Remove',
			effects: [
				{
					type: 'resource',
					method: 'remove',
					params: roundDownParams,
				},
			],
		});
		const engineContext = createTestEngine({ actions });
		advance(engineContext);
		engineContext.game.currentPlayerIndex = 0;

		let before = engineContext.activePlayer.gold;
		const roundUpDelta = roundUpParams.resolveDelta(before);
		let cost =
			getActionCosts('round_up_remove', engineContext)[Resource.ap] ?? 0;
		engineContext.activePlayer.ap = cost;
		performAction('round_up_remove', engineContext);
		expect(engineContext.activePlayer.gold).toBe(before - roundUpDelta);

		before = engineContext.activePlayer.gold;
		const roundDownDelta = roundDownParams.resolveDelta(before);
		cost = getActionCosts('round_down_remove', engineContext)[Resource.ap] ?? 0;
		engineContext.activePlayer.ap = cost;
		performAction('round_down_remove', engineContext);
		expect(engineContext.activePlayer.gold).toBe(before - roundDownDelta);
	});
});
