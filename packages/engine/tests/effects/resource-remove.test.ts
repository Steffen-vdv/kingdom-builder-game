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
import { resourceAmountParams } from '../helpers/resourceV2Params.ts';

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
					params: resourceAmountParams(CResource.gold, 3),
				},
			],
		});
		const engineContext = createTestEngine({ actions });
		advance(engineContext);
		engineContext.game.currentPlayerIndex = 0;
		const before = engineContext.activePlayer.gold;
		const actionDefinition = actions.get('pay_gold');
		const amount = actionDefinition.effects.find(
			(effect) =>
				effect.type === 'resource' &&
				effect.method === 'remove' &&
				effect.params?.key === CResource.gold,
		)?.params?.change?.amount as number;
		const cost = getActionCosts('pay_gold', engineContext)[Resource.ap] ?? 0;
		engineContext.activePlayer.ap = cost;
		performAction('pay_gold', engineContext);
		expect(engineContext.activePlayer.gold).toBe(before - amount);
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
					params: resourceAmountParams(CResource.gold, 1.2),
					round: 'up',
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
					params: resourceAmountParams(CResource.gold, 1.8),
					round: 'down',
				},
			],
		});
		const engineContext = createTestEngine({ actions });
		advance(engineContext);
		engineContext.game.currentPlayerIndex = 0;

		let before = engineContext.activePlayer.gold;
		let foundEffect = actions
			.get('round_up_remove')
			.effects.find(
				(effect) =>
					effect.type === 'resource' &&
					effect.method === 'remove' &&
					effect.params?.key === CResource.gold,
			);
		let total = (foundEffect?.params?.change?.amount as number) || 0;
		if (foundEffect?.round === 'up') {
			total = total >= 0 ? Math.ceil(total) : Math.floor(total);
		} else if (foundEffect?.round === 'down') {
			total = total >= 0 ? Math.floor(total) : Math.ceil(total);
		}
		let cost =
			getActionCosts('round_up_remove', engineContext)[Resource.ap] ?? 0;
		engineContext.activePlayer.ap = cost;
		performAction('round_up_remove', engineContext);
		expect(engineContext.activePlayer.gold).toBe(before - total);

		before = engineContext.activePlayer.gold;
		foundEffect = actions
			.get('round_down_remove')
			.effects.find(
				(effect) =>
					effect.type === 'resource' &&
					effect.method === 'remove' &&
					effect.params?.key === CResource.gold,
			);
		total = (foundEffect?.params?.change?.amount as number) || 0;
		if (foundEffect?.round === 'up') {
			total = total >= 0 ? Math.ceil(total) : Math.floor(total);
		} else if (foundEffect?.round === 'down') {
			total = total >= 0 ? Math.floor(total) : Math.ceil(total);
		}
		cost = getActionCosts('round_down_remove', engineContext)[Resource.ap] ?? 0;
		engineContext.activePlayer.ap = cost;
		performAction('round_down_remove', engineContext);
		expect(engineContext.activePlayer.gold).toBe(before - total);
	});
});
