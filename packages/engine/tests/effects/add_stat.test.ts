import { describe, it, expect } from 'vitest';
import {
	performAction,
	Resource,
	advance,
	getActionCosts,
} from '../../src/index.ts';
import { createActionRegistry, Stat as CStat } from '@kingdom-builder/contents';
import { createTestEngine } from '../helpers.ts';
import { statAmountParams } from '../helpers/resourceV2Params.ts';

describe('stat:add effect', () => {
	it('increments a stat via action effect', () => {
		const actionRegistry = createActionRegistry();
		actionRegistry.add('train_army', {
			id: 'train_army',
			name: 'Train Army',
			effects: [
				{
					type: 'stat',
					method: 'add',
					params: statAmountParams(CStat.armyStrength, 3),
				},
			],
		});
		const engineContext = createTestEngine({ actions: actionRegistry });
		advance(engineContext);
		engineContext.game.currentPlayerIndex = 0;
		const armyStrengthBefore = engineContext.activePlayer.armyStrength;
		const trainingActionDefinition = actionRegistry.get('train_army');
		const armyStrengthIncrease = trainingActionDefinition.effects.find(
			(effect) =>
				effect.type === 'stat' &&
				effect.method === 'add' &&
				effect.params?.key === CStat.armyStrength,
		)?.params?.amount as number;
		const actionCosts = getActionCosts('train_army', engineContext);
		engineContext.activePlayer.ap = actionCosts[Resource.ap] ?? 0;
		performAction('train_army', engineContext);
		expect(engineContext.activePlayer.armyStrength).toBe(
			armyStrengthBefore + armyStrengthIncrease,
		);
	});
});
