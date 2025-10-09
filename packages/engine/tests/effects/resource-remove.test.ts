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

describe('resource:remove effect', () => {
	it('decrements a resource via action effect', () => {
		const actions = createActionRegistry();
		actions.add('pay_gold', {
			id: 'pay_gold',
			name: 'Pay Gold',
			baseCosts: { [CResource.ap]: 0 },
			effects: [
				{
					type: 'resource',
					method: 'remove',
					params: { key: CResource.gold, amount: 3 },
				},
			],
		});
		const engineContext = createTestEngine({ actions });
		advance(engineContext);
		engineContext.game.currentPlayerIndex = 0;
		const goldBeforeAction = engineContext.activePlayer.gold;
		const actionDefinition = actions.get('pay_gold');
		const goldRemovalAmount = actionDefinition.effects.find(
			(effect) =>
				effect.type === 'resource' &&
				effect.method === 'remove' &&
				effect.params?.key === CResource.gold,
		)?.params?.amount as number;
		const actionPointCost =
			getActionCosts('pay_gold', engineContext)[Resource.ap] ?? 0;
		engineContext.activePlayer.ap = actionPointCost;
		performAction('pay_gold', engineContext);
		expect(engineContext.activePlayer.gold).toBe(
			goldBeforeAction - goldRemovalAmount,
		);
	});

	it('rounds fractional amounts according to round setting', () => {
		const actions = createActionRegistry();
		actions.add('round_up_remove', {
			id: 'round_up_remove',
			name: 'Round Up Remove',
			baseCosts: { [CResource.ap]: 0 },
			effects: [
				{
					type: 'resource',
					method: 'remove',
					params: { key: CResource.gold, amount: 1.2 },
					round: 'up',
				},
			],
		});
		actions.add('round_down_remove', {
			id: 'round_down_remove',
			name: 'Round Down Remove',
			baseCosts: { [CResource.ap]: 0 },
			effects: [
				{
					type: 'resource',
					method: 'remove',
					params: { key: CResource.gold, amount: 1.8 },
					round: 'down',
				},
			],
		});
		const engineContext = createTestEngine({ actions });
		advance(engineContext);
		engineContext.game.currentPlayerIndex = 0;

		let goldBeforeAction = engineContext.activePlayer.gold;
		let resourceRemoveEffect = actions
			.get('round_up_remove')
			.effects.find(
				(effect) =>
					effect.type === 'resource' &&
					effect.method === 'remove' &&
					effect.params?.key === CResource.gold,
			);
		let roundedAmount = (resourceRemoveEffect?.params?.amount as number) || 0;
		if (resourceRemoveEffect?.round === 'up') {
			roundedAmount =
				roundedAmount >= 0
					? Math.ceil(roundedAmount)
					: Math.floor(roundedAmount);
		} else if (resourceRemoveEffect?.round === 'down') {
			roundedAmount =
				roundedAmount >= 0
					? Math.floor(roundedAmount)
					: Math.ceil(roundedAmount);
		}
		let actionPointCost =
			getActionCosts('round_up_remove', engineContext)[Resource.ap] ?? 0;
		engineContext.activePlayer.ap = actionPointCost;
		performAction('round_up_remove', engineContext);
		expect(engineContext.activePlayer.gold).toBe(
			goldBeforeAction - roundedAmount,
		);

		goldBeforeAction = engineContext.activePlayer.gold;
		resourceRemoveEffect = actions
			.get('round_down_remove')
			.effects.find(
				(effect) =>
					effect.type === 'resource' &&
					effect.method === 'remove' &&
					effect.params?.key === CResource.gold,
			);
		roundedAmount = (resourceRemoveEffect?.params?.amount as number) || 0;
		if (resourceRemoveEffect?.round === 'up') {
			roundedAmount =
				roundedAmount >= 0
					? Math.ceil(roundedAmount)
					: Math.floor(roundedAmount);
		} else if (resourceRemoveEffect?.round === 'down') {
			roundedAmount =
				roundedAmount >= 0
					? Math.floor(roundedAmount)
					: Math.ceil(roundedAmount);
		}
		actionPointCost =
			getActionCosts('round_down_remove', engineContext)[Resource.ap] ?? 0;
		engineContext.activePlayer.ap = actionPointCost;
		performAction('round_down_remove', engineContext);
		expect(engineContext.activePlayer.gold).toBe(
			goldBeforeAction - roundedAmount,
		);
	});
});
