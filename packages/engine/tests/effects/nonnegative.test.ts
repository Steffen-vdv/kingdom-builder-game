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

describe('resource and stat bounds', () => {
	it('clamps stat removal to zero', () => {
		const actions = createActionRegistry();
		actions.add('lower_fort', {
			id: 'lower_fort',
			name: 'Lower Fort',
			baseCosts: { [CResource.ap]: 0 },
			effects: [
				{
					type: 'stat',
					method: 'remove',
					params: { key: CStat.fortificationStrength, amount: 3 },
				},
			],
		});
		const engineContext = createTestEngine({ actions });
		advance(engineContext);
		engineContext.game.currentPlayerIndex = 0;
		const actionDef = actions.get('lower_fort');
		const effectAmount = actionDef.effects.find(
			(effect) => effect.type === 'stat',
		)?.params?.amount as number;
		engineContext.activePlayer.stats[CStat.fortificationStrength] =
			effectAmount - 1;
		const cost = getActionCosts('lower_fort', engineContext)[Resource.ap] ?? 0;
		engineContext.activePlayer.ap = cost;
		performAction('lower_fort', engineContext);
		expect(engineContext.activePlayer.fortificationStrength).toBe(0);
	});

	it('clamps resource additions to zero', () => {
		const actions = createActionRegistry();
		actions.add('lose_gold', {
			id: 'lose_gold',
			name: 'Lose Gold',
			baseCosts: { [CResource.ap]: 0 },
			effects: [
				{
					type: 'resource',
					method: 'add',
					params: { key: CResource.gold, amount: -5 },
				},
			],
		});
		const engineContext = createTestEngine({ actions });
		advance(engineContext);
		engineContext.game.currentPlayerIndex = 0;
		const actionDef = actions.get('lose_gold');
		const effectAmount = actionDef.effects.find(
			(effect) => effect.type === 'resource',
		)?.params?.amount as number;
		engineContext.activePlayer.gold = 1;
		const cost = getActionCosts('lose_gold', engineContext)[Resource.ap] ?? 0;
		engineContext.activePlayer.ap = cost;
		performAction('lose_gold', engineContext);
		expect(engineContext.activePlayer.gold).toBe(Math.max(1 + effectAmount, 0));
	});

	it('clamps negative stat additions to zero', () => {
		const actions = createActionRegistry();
		actions.add('bad_add', {
			id: 'bad_add',
			name: 'Bad Add',
			baseCosts: { [CResource.ap]: 0 },
			effects: [
				{
					type: 'stat',
					method: 'add',
					params: { key: CStat.armyStrength, amount: -4 },
				},
			],
		});
		const engineContext = createTestEngine({ actions });
		advance(engineContext);
		engineContext.game.currentPlayerIndex = 0;
		const actionDef = actions.get('bad_add');
		const effectAmount = actionDef.effects.find(
			(effect) => effect.type === 'stat',
		)?.params?.amount as number;
		const before = engineContext.activePlayer.armyStrength;
		const cost = getActionCosts('bad_add', engineContext)[Resource.ap] ?? 0;
		engineContext.activePlayer.ap = cost;
		performAction('bad_add', engineContext);
		expect(engineContext.activePlayer.armyStrength).toBe(
			Math.max(before + effectAmount, 0),
		);
	});
});
