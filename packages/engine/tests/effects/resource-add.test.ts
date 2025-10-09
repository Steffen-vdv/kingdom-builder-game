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

describe('resource:add effect', () => {
	it('increments a resource via action effect', () => {
		const actions = createActionRegistry();
		actions.add('grant_gold', {
			id: 'grant_gold',
			name: 'Grant Gold',
			baseCosts: { [CResource.ap]: 0 },
			effects: [
				{
					type: 'resource',
					method: 'add',
					params: { key: CResource.gold, amount: 3 },
				},
			],
		});
		const engineContext = createTestEngine({ actions });
		advance(engineContext);
		engineContext.game.currentPlayerIndex = 0;
		const goldBeforeAction = engineContext.activePlayer.gold;
		const actionDefinition = actions.get('grant_gold');
		const amount = actionDefinition.effects.find(
			(effect) =>
				effect.type === 'resource' &&
				effect.method === 'add' &&
				effect.params?.key === CResource.gold,
		)?.params?.amount as number;
		const actionPointCost =
			getActionCosts('grant_gold', engineContext)[Resource.ap] ?? 0;
		engineContext.activePlayer.ap = actionPointCost;
		performAction('grant_gold', engineContext);
		expect(engineContext.activePlayer.gold).toBe(goldBeforeAction + amount);
	});

	it('rounds fractional amounts according to round setting', () => {
		const actions = createActionRegistry();
		actions.add('round_up', {
			id: 'round_up',
			name: 'Round Up',
			baseCosts: { [CResource.ap]: 0 },
			effects: [
				{
					type: 'resource',
					method: 'add',
					params: { key: CResource.gold, amount: 1.2 },
					round: 'up',
				},
			],
		});
		actions.add('round_down', {
			id: 'round_down',
			name: 'Round Down',
			baseCosts: { [CResource.ap]: 0 },
			effects: [
				{
					type: 'resource',
					method: 'add',
					params: { key: CResource.gold, amount: 1.8 },
					round: 'down',
				},
			],
		});
		const engineContext = createTestEngine({ actions });
		advance(engineContext);
		engineContext.game.currentPlayerIndex = 0;

		let goldBeforeAction = engineContext.activePlayer.gold;
		let foundEffect = actions
			.get('round_up')
			.effects.find(
				(effect) =>
					effect.type === 'resource' &&
					effect.method === 'add' &&
					effect.params?.key === CResource.gold,
			);
		let roundedAmount = (foundEffect?.params?.amount as number) || 0;
		if (foundEffect?.round === 'up') {
			roundedAmount =
				roundedAmount >= 0
					? Math.ceil(roundedAmount)
					: Math.floor(roundedAmount);
		} else if (foundEffect?.round === 'down') {
			roundedAmount =
				roundedAmount >= 0
					? Math.floor(roundedAmount)
					: Math.ceil(roundedAmount);
		}
		let actionPointCost =
			getActionCosts('round_up', engineContext)[Resource.ap] ?? 0;
		engineContext.activePlayer.ap = actionPointCost;
		performAction('round_up', engineContext);
		expect(engineContext.activePlayer.gold).toBe(
			goldBeforeAction + roundedAmount,
		);

		goldBeforeAction = engineContext.activePlayer.gold;
		foundEffect = actions
			.get('round_down')
			.effects.find(
				(effect) =>
					effect.type === 'resource' &&
					effect.method === 'add' &&
					effect.params?.key === CResource.gold,
			);
		roundedAmount = (foundEffect?.params?.amount as number) || 0;
		if (foundEffect?.round === 'up') {
			roundedAmount =
				roundedAmount >= 0
					? Math.ceil(roundedAmount)
					: Math.floor(roundedAmount);
		} else if (foundEffect?.round === 'down') {
			roundedAmount =
				roundedAmount >= 0
					? Math.floor(roundedAmount)
					: Math.ceil(roundedAmount);
		}
		actionPointCost =
			getActionCosts('round_down', engineContext)[Resource.ap] ?? 0;
		engineContext.activePlayer.ap = actionPointCost;
		performAction('round_down', engineContext);
		expect(engineContext.activePlayer.gold).toBe(
			goldBeforeAction + roundedAmount,
		);
	});
});
