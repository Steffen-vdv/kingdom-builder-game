import { describe, it, expect } from 'vitest';
import {
	createEngine,
	performAction,
	getActionEffectGroups,
} from '@kingdom-builder/engine';
import {
	PHASES,
	POPULATIONS,
	GAME_START,
	RULES,
	BUILDINGS,
	DEVELOPMENTS,
	createBuildingRegistry,
	createDevelopmentRegistry,
} from '@kingdom-builder/contents';
import { logContent } from '@kingdom-builder/web/translation/content';
import { createContentFactory } from '../../packages/engine/tests/factories/content';

describe('integration: action effect groups', () => {
	it('requires explicit choices and logs the selected branch', () => {
		const content = createContentFactory();
		const action = content.action({
			name: 'Choose Reward',
			effects: [
				{
					group: 'reward',
					label: 'Reward',
					options: [
						{
							id: 'gain',
							label: 'Gain resource',
							effects: [
								{
									type: 'resource',
									method: 'add',
									params: { key: '$resource', amount: '$amount' },
								},
							],
						},
					],
				},
			],
		});
		const delegate = content.action({
			name: 'Delegate Reward',
			effects: [
				{
					type: 'action',
					method: 'perform',
					params: {
						id: action.id,
						resource: '$resource',
						amount: '$amount',
						choices: {
							reward: { option: 'gain', params: { amount: '$amount' } },
						},
					},
				},
			],
		});

		const buildings = createBuildingRegistry();
		for (const [id, def] of BUILDINGS.entries()) buildings.add(id, def);
		const developments = createDevelopmentRegistry();
		for (const [id, def] of DEVELOPMENTS.entries()) developments.add(id, def);

		const ctx = createEngine({
			actions: content.actions,
			buildings,
			developments,
			populations: POPULATIONS,
			phases: PHASES,
			start: GAME_START,
			rules: RULES,
		});

		const resourceKey = 'integration-resource';
		expect(() =>
			performAction(action.id, ctx, { resource: resourceKey }),
		).toThrowError(/Missing choice for action effect group/);

		ctx.activePlayer.resources[resourceKey] = 0;
		ctx.activePlayer.ap = 1;
		const traces = performAction(action.id, ctx, {
			resource: resourceKey,
			choices: { reward: { option: 'gain', params: { amount: 4 } } },
		});
		expect(ctx.activePlayer.resources[resourceKey]).toBe(4);
		expect(Array.isArray(traces)).toBe(true);
		expect(traces).toEqual([]);

		const groups = getActionEffectGroups(action.id, ctx, {
			resource: resourceKey,
		});
		expect(groups).toHaveLength(1);

		const log = logContent('action', action.id, ctx, {
			resource: resourceKey,
			choices: { reward: { option: 'gain', params: { amount: 4 } } },
		});
		expect(log.some((line) => line.includes('Chose'))).toBe(true);

		ctx.activePlayer.resources[resourceKey] = 0;
		ctx.activePlayer.ap = 1;
		const nestedTraces = performAction(delegate.id, ctx, {
			resource: resourceKey,
			amount: 2,
		});
		expect(ctx.activePlayer.resources[resourceKey]).toBe(2);
		expect(nestedTraces).toHaveLength(1);
		expect(nestedTraces[0]?.id).toBe(action.id);
	});
});
