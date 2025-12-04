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
	Stat as CStat,
} from '@kingdom-builder/contents';
import { createTestEngine } from '../helpers.ts';
import {
	resourceAmountParams,
	statAmountParams,
	type ResourceAmountParamsResult,
	type StatAmountParamsResult,
} from '../helpers/resourceV2Params.ts';

describe('resource and stat bounds', () => {
	it('clamps stat removal to zero', () => {
		const actions = createActionRegistry();
		actions.add('lower_fort', {
			id: 'lower_fort',
			name: 'Lower Fort',
			effects: [
				{
					type: 'stat',
					method: 'remove',
					params: statAmountParams({
						key: CStat.fortificationStrength,
						amount: 3,
					}),
				},
			],
		});
		const engineContext = createTestEngine({ actions });
		advance(engineContext);
		engineContext.game.currentPlayerIndex = 0;
		const actionDef = actions.get('lower_fort');
		const statParams = actionDef.effects.find(
			(effect) => effect.type === 'stat',
		)?.params as StatAmountParamsResult | undefined;
		const effectAmount = statParams?.amount ?? 0;
		engineContext.activePlayer.resourceValues[CStat.fortificationStrength] =
			effectAmount - 1;
		const cost = getActionCosts('lower_fort', engineContext)[CResource.ap] ?? 0;
		engineContext.activePlayer.resourceValues[CResource.ap] = cost;
		performAction('lower_fort', engineContext);
		expect(
			getResourceValue(engineContext.activePlayer, CStat.fortificationStrength),
		).toBe(0);
	});

	it('clamps resource additions to zero', () => {
		const actions = createActionRegistry();
		actions.add('lose_gold', {
			id: 'lose_gold',
			name: 'Lose Gold',
			effects: [
				{
					type: 'resource',
					method: 'add',
					params: resourceAmountParams({
						key: CResource.gold,
						amount: -5,
					}),
				},
			],
		});
		const engineContext = createTestEngine({ actions });
		advance(engineContext);
		engineContext.game.currentPlayerIndex = 0;
		const actionDef = actions.get('lose_gold');
		const resourceParams = actionDef.effects.find(
			(effect) => effect.type === 'resource',
		)?.params as ResourceAmountParamsResult | undefined;
		const effectAmount = resourceParams?.amount ?? 0;
		engineContext.activePlayer.resourceValues[CResource.gold] = 1;
		const cost = getActionCosts('lose_gold', engineContext)[CResource.ap] ?? 0;
		engineContext.activePlayer.resourceValues[CResource.ap] = cost;
		performAction('lose_gold', engineContext);
		expect(getResourceValue(engineContext.activePlayer, CResource.gold)).toBe(
			Math.max(1 + effectAmount, 0),
		);
	});

	it('clamps negative stat additions to zero', () => {
		const actions = createActionRegistry();
		actions.add('bad_add', {
			id: 'bad_add',
			name: 'Bad Add',
			effects: [
				{
					type: 'stat',
					method: 'add',
					params: statAmountParams({
						key: CStat.armyStrength,
						amount: -4,
					}),
				},
			],
		});
		const engineContext = createTestEngine({ actions });
		advance(engineContext);
		engineContext.game.currentPlayerIndex = 0;
		const actionDef = actions.get('bad_add');
		const addParams = actionDef.effects.find((effect) => effect.type === 'stat')
			?.params as StatAmountParamsResult | undefined;
		const effectAmount = addParams?.amount ?? 0;
		const before = getResourceValue(
			engineContext.activePlayer,
			CStat.armyStrength,
		);
		const cost = getActionCosts('bad_add', engineContext)[CResource.ap] ?? 0;
		engineContext.activePlayer.resourceValues[CResource.ap] = cost;
		performAction('bad_add', engineContext);
		expect(
			getResourceValue(engineContext.activePlayer, CStat.armyStrength),
		).toBe(Math.max(before + effectAmount, 0));
	});
});
