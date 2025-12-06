import { describe, it, expect } from 'vitest';
import { performAction, advance, getActionCosts } from '../../src/index.ts';
import {
	createActionRegistry,
	Stat as CStat,
	Resource as CResource,
} from '@kingdom-builder/contents';
import { createTestEngine } from '../helpers.ts';
import {
	resourceAmountParams,
	type ResourceAmountParamsResult,
} from '../helpers/resourceV2Params.ts';

describe('resource:add effect for stats', () => {
	it('increments a stat via action effect', () => {
		const actionRegistry = createActionRegistry();
		actionRegistry.add('train_army', {
			id: 'train_army',
			name: 'Train Army',
			effects: [
				{
					type: 'resource',
					method: 'add',
					params: resourceAmountParams({
						key: CStat.armyStrength,
						amount: 3,
					}),
				},
			],
		});
		const engineContext = createTestEngine({ actions: actionRegistry });
		advance(engineContext);
		engineContext.game.currentPlayerIndex = 0;
		const armyStrengthBefore =
			engineContext.activePlayer.resourceValues[CStat.armyStrength] ?? 0;
		const trainingActionDefinition = actionRegistry.get('train_army');
		const params = trainingActionDefinition.effects.find(
			(effect) =>
				effect.type === 'resource' &&
				effect.method === 'add' &&
				effect.params?.key === CStat.armyStrength,
		)?.params as ResourceAmountParamsResult | undefined;
		const armyStrengthIncrease = params?.amount ?? 0;
		const actionCosts = getActionCosts('train_army', engineContext);
		engineContext.activePlayer.resourceValues[CResource.ap] =
			actionCosts[CResource.ap] ?? 0;
		performAction('train_army', engineContext);
		expect(engineContext.activePlayer.resourceValues[CStat.armyStrength]).toBe(
			armyStrengthBefore + armyStrengthIncrease,
		);
	});
});
