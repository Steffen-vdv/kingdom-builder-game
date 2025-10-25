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

describe('resource:add effect', () => {
	it('increments a resource via action effect', () => {
		const actions = createActionRegistry();
		const goldResourceId = getResourceV2Id(CResource.gold);
		const params = resourceChange(goldResourceId).amount(3).build();
		actions.add('grant_gold', {
			id: 'grant_gold',
			name: 'Grant Gold',
			effects: [
				{
					type: 'resource',
					method: 'add',
					params: { ...params, key: CResource.gold },
				},
			],
		});
		const engineContext = createTestEngine({ actions });
		advance(engineContext);
		engineContext.game.currentPlayerIndex = 0;
		const before = engineContext.activePlayer.gold;
		const actionDefinition = actions.get('grant_gold');
		const change = actionDefinition.effects.find(
			(effect) =>
				effect.type === 'resource' &&
				effect.method === 'add' &&
				(effect.params as ResourceChangeEffectParams | undefined)
					?.resourceId === goldResourceId,
		)?.params as ResourceChangeEffectParams | undefined;
		const amount = change
			? computeRequestedResourceDelta({
					currentValue: before,
					change: change.change,
				})
			: 0;
		const cost = getActionCosts('grant_gold', engineContext)[Resource.ap] ?? 0;
		engineContext.activePlayer.ap = cost;
		performAction('grant_gold', engineContext);
		expect(engineContext.activePlayer.gold).toBe(before + amount);
	});

	it('rounds fractional amounts according to round setting', () => {
		const actions = createActionRegistry();
		const goldResourceId = getResourceV2Id(CResource.gold);
		actions.add('round_up', {
			id: 'round_up',
			name: 'Round Up',
			effects: [
				{
					type: 'resource',
					method: 'add',
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
		actions.add('round_down', {
			id: 'round_down',
			name: 'Round Down',
			effects: [
				{
					type: 'resource',
					method: 'add',
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

		let before = 4;
		engineContext.activePlayer.gold = before;
		let foundEffect = actions
			.get('round_up')
			.effects.find(
				(effect) =>
					effect.type === 'resource' &&
					effect.method === 'add' &&
					(effect.params as ResourceChangeEffectParams | undefined)
						?.resourceId === goldResourceId,
			)?.params as ResourceChangeEffectParams | undefined;
		let total = foundEffect
			? computeRequestedResourceDelta({
					currentValue: before,
					change: foundEffect.change,
				})
			: 0;
		let cost = getActionCosts('round_up', engineContext)[Resource.ap] ?? 0;
		engineContext.activePlayer.ap = cost;
		performAction('round_up', engineContext);
		expect(engineContext.activePlayer.gold).toBe(before + total);

		before = 4;
		engineContext.activePlayer.gold = before;
		foundEffect = actions
			.get('round_down')
			.effects.find(
				(effect) =>
					effect.type === 'resource' &&
					effect.method === 'add' &&
					(effect.params as ResourceChangeEffectParams | undefined)
						?.resourceId === goldResourceId,
			)?.params as ResourceChangeEffectParams | undefined;
		total = foundEffect
			? computeRequestedResourceDelta({
					currentValue: before,
					change: foundEffect.change,
				})
			: 0;
		cost = getActionCosts('round_down', engineContext)[Resource.ap] ?? 0;
		engineContext.activePlayer.ap = cost;
		performAction('round_down', engineContext);
		expect(engineContext.activePlayer.gold).toBe(before + total);
	});
});
