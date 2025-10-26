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
	Stat as CStat,
} from '@kingdom-builder/contents';
import { createTestEngine } from '../helpers.ts';
import {
	resourceAmountParams,
	statAmountParams,
} from '../helpers/resourceV2Params.ts';

describe('resource and stat bounds', () => {
	it('clamps stat removal to zero', () => {
		const actions = createActionRegistry();
		const params = statAmountParams(CStat.fortificationStrength, 3);
		actions.add('lower_fort', {
			id: 'lower_fort',
			name: 'Lower Fort',
			effects: [
				{
					type: 'stat',
					method: 'remove',
					params,
				},
			],
		});
		const engineContext = createTestEngine({ actions });
		advance(engineContext);
		engineContext.game.currentPlayerIndex = 0;
		const effectAmount = params.amount;
		engineContext.activePlayer.stats[CStat.fortificationStrength] =
			effectAmount - 1;
		const cost = getActionCosts('lower_fort', engineContext)[Resource.ap] ?? 0;
		engineContext.activePlayer.ap = cost;
		performAction('lower_fort', engineContext);
		expect(engineContext.activePlayer.fortificationStrength).toBe(0);
	});

	it('clamps resource additions to zero', () => {
		const actions = createActionRegistry();
		const resourceParams = resourceAmountParams(CResource.gold, -5);
		actions.add('lose_gold', {
			id: 'lose_gold',
			name: 'Lose Gold',
			effects: [
				{
					type: 'resource',
					method: 'add',
					params: resourceParams,
				},
			],
		});
		const engineContext = createTestEngine({ actions });
		advance(engineContext);
		engineContext.game.currentPlayerIndex = 0;
		const effectAmount = resourceParams.amount;
		engineContext.activePlayer.gold = 1;
		const cost = getActionCosts('lose_gold', engineContext)[Resource.ap] ?? 0;
		engineContext.activePlayer.ap = cost;
		performAction('lose_gold', engineContext);
		expect(engineContext.activePlayer.gold).toBe(Math.max(1 + effectAmount, 0));
	});

	it('clamps negative stat additions to zero', () => {
		const actions = createActionRegistry();
		const statParams = statAmountParams(CStat.armyStrength, -4);
		actions.add('bad_add', {
			id: 'bad_add',
			name: 'Bad Add',
			effects: [
				{
					type: 'stat',
					method: 'add',
					params: statParams,
				},
			],
		});
		const engineContext = createTestEngine({ actions });
		advance(engineContext);
		engineContext.game.currentPlayerIndex = 0;
		const effectAmount = statParams.amount;
		const before = engineContext.activePlayer.armyStrength;
		const cost = getActionCosts('bad_add', engineContext)[Resource.ap] ?? 0;
		engineContext.activePlayer.ap = cost;
		performAction('bad_add', engineContext);
		expect(engineContext.activePlayer.armyStrength).toBe(
			Math.max(before + effectAmount, 0),
		);
	});
});
