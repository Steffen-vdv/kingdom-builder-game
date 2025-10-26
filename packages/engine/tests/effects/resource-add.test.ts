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
	resourcePercentDelta,
} from '../helpers/resourceV2Params.ts';

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
					params: resourceAmountParams(CResource.gold, 3),
				},
			],
		});
		const engineContext = createTestEngine({ actions });
		advance(engineContext);
		engineContext.game.currentPlayerIndex = 0;
		const before = engineContext.activePlayer.gold;
		const actionDefinition = actions.get('grant_gold');
		const amount = actionDefinition.effects.find(
			(effect) =>
				effect.type === 'resource' &&
				effect.method === 'add' &&
				effect.params?.key === CResource.gold,
		)?.params?.amount as number;
		const cost = getActionCosts('grant_gold', engineContext)[Resource.ap] ?? 0;
		engineContext.activePlayer.ap = cost;
		performAction('grant_gold', engineContext);
		expect(engineContext.activePlayer.gold).toBe(before + amount);
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
					params: resourcePercentParams(CResource.gold, 0.12, {
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
					params: resourcePercentParams(CResource.gold, 0.18, {
						roundingMode: 'down',
					}),
				},
			],
		});
		const engineContext = createTestEngine({ actions });
		advance(engineContext);
		engineContext.game.currentPlayerIndex = 0;

		let before = engineContext.activePlayer.gold;
		let foundEffect = actions
			.get('round_up')
			.effects.find(
				(effect) =>
					effect.type === 'resource' &&
					effect.method === 'add' &&
					effect.params?.key === CResource.gold,
			);
		const roundedUp = resourcePercentDelta(
			before,
			foundEffect?.params as ReturnType<typeof resourcePercentParams>,
		);
		let cost = getActionCosts('round_up', engineContext)[Resource.ap] ?? 0;
		engineContext.activePlayer.ap = cost;
		performAction('round_up', engineContext);
		expect(engineContext.activePlayer.gold).toBe(before + roundedUp);

		before = engineContext.activePlayer.gold;
		foundEffect = actions
			.get('round_down')
			.effects.find(
				(effect) =>
					effect.type === 'resource' &&
					effect.method === 'add' &&
					effect.params?.key === CResource.gold,
			);
		const roundedDown = resourcePercentDelta(
			before,
			foundEffect?.params as ReturnType<typeof resourcePercentParams>,
		);
		cost = getActionCosts('round_down', engineContext)[Resource.ap] ?? 0;
		engineContext.activePlayer.ap = cost;
		performAction('round_down', engineContext);
		expect(engineContext.activePlayer.gold).toBe(before + roundedDown);
	});
});
