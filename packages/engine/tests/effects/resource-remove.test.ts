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
import { getResourceV2Id } from '@kingdom-builder/contents/resources';
import {
	resourceChange,
	type ResourceChangeEffectParams,
} from '@kingdom-builder/contents/resourceV2';
import { computeRequestedResourceDelta } from '../../src/resource-v2/index.ts';
import { createTestEngine } from '../helpers.ts';

describe('resource:remove effect', () => {
	it('decrements a resource via action effect', () => {
		const actions = createActionRegistry();
		const goldResourceId = getResourceV2Id(CResource.gold);
		const params = resourceChange(goldResourceId).amount(3).build();
		actions.add('pay_gold', {
			id: 'pay_gold',
			name: 'Pay Gold',
			effects: [
				{
					type: 'resource',
					method: 'remove',
					params: { ...params, key: CResource.gold },
				},
			],
		});
		const engineContext = createTestEngine({ actions });
		advance(engineContext);
		engineContext.game.currentPlayerIndex = 0;
		const before = engineContext.activePlayer.gold;
		const actionDefinition = actions.get('pay_gold');
		const change = actionDefinition.effects.find(
			(effect) =>
				effect.type === 'resource' &&
				effect.method === 'remove' &&
				(effect.params as ResourceChangeEffectParams | undefined)
					?.resourceId === goldResourceId,
		)?.params as ResourceChangeEffectParams | undefined;
		const amount = change
			? computeRequestedResourceDelta({
					currentValue: before,
					change: change.change,
				})
			: 0;
		const cost = getActionCosts('pay_gold', engineContext)[Resource.ap] ?? 0;
		engineContext.activePlayer.ap = cost;
		performAction('pay_gold', engineContext);
		expect(engineContext.activePlayer.gold).toBe(before - amount);
	});

	it('rounds fractional amounts according to round setting', () => {
		const actions = createActionRegistry();
		const goldResourceId = getResourceV2Id(CResource.gold);
		actions.add('round_up_remove', {
			id: 'round_up_remove',
			name: 'Round Up Remove',
			effects: [
				{
					type: 'resource',
					method: 'remove',
					params: {
						...resourceChange(goldResourceId)
							.percent(0.5)
							.roundingMode('up')
							.build(),
						key: CResource.gold,
					},
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
					params: {
						...resourceChange(goldResourceId)
							.percent(0.5)
							.roundingMode('down')
							.build(),
						key: CResource.gold,
					},
				},
			],
		});
		const engineContext = createTestEngine({ actions });
		advance(engineContext);
		engineContext.game.currentPlayerIndex = 0;

		let before = 10;
		engineContext.activePlayer.gold = before;
		let foundEffect = actions
			.get('round_up_remove')
			.effects.find(
				(effect) =>
					effect.type === 'resource' &&
					effect.method === 'remove' &&
					(effect.params as ResourceChangeEffectParams | undefined)
						?.resourceId === goldResourceId,
			)?.params as ResourceChangeEffectParams | undefined;
		let total = foundEffect
			? computeRequestedResourceDelta({
					currentValue: before,
					change: foundEffect.change,
				})
			: 0;
		let cost =
			getActionCosts('round_up_remove', engineContext)[Resource.ap] ?? 0;
		engineContext.activePlayer.ap = cost;
		performAction('round_up_remove', engineContext);
		expect(engineContext.activePlayer.gold).toBe(before - total);

		before = 10;
		engineContext.activePlayer.gold = before;
		foundEffect = actions
			.get('round_down_remove')
			.effects.find(
				(effect) =>
					effect.type === 'resource' &&
					effect.method === 'remove' &&
					(effect.params as ResourceChangeEffectParams | undefined)
						?.resourceId === goldResourceId,
			)?.params as ResourceChangeEffectParams | undefined;
		total = foundEffect
			? computeRequestedResourceDelta({
					currentValue: before,
					change: foundEffect.change,
				})
			: 0;
		cost = getActionCosts('round_down_remove', engineContext)[Resource.ap] ?? 0;
		engineContext.activePlayer.ap = cost;
		performAction('round_down_remove', engineContext);
		expect(engineContext.activePlayer.gold).toBe(before - total);
	});
});
