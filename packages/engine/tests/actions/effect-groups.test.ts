import { describe, it, expect } from 'vitest';
import { performAction, getActionEffectGroups } from '../../src';
import { createTestEngine } from '../helpers';
import { createContentFactory } from '../factories/content';

describe('action effect groups', () => {
	it('throws when required group choice is missing', () => {
		const content = createContentFactory();
		const action = content.action({
			effects: [
				{
					group: 'target',
					label: 'Target resource',
					options: [
						{
							id: 'gain',
							label: 'Gain resource',
							effects: [
								{
									type: 'resource',
									method: 'add',
									params: { key: 'custom-resource', amount: 1 },
								},
							],
						},
					],
				},
			],
		});
		const ctx = createTestEngine(content);
		expect(() => performAction(action.id, ctx)).toThrowError(
			/Missing choice for action effect group/,
		);
	});

	it('applies the selected branch and records action traces', () => {
		const content = createContentFactory();
		const action = content.action({
			effects: [
				{
					group: 'target',
					label: 'Target resource',
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
		const ctx = createTestEngine(content);
		const resourceKey = 'custom-resource';
		ctx.activePlayer.resources[resourceKey] = 0;
		ctx.activePlayer.ap = 1;
		const traces = performAction(action.id, ctx, {
			resource: resourceKey,
			choices: { target: { option: 'gain', params: { amount: 3 } } },
		});
		expect(ctx.activePlayer.resources[resourceKey]).toBe(3);
		expect(traces).toEqual([]);
	});

	it('exposes action effect groups for discovery', () => {
		const content = createContentFactory();
		const action = content.action({
			effects: [
				{
					group: 'target',
					label: 'Target resource',
					options: [
						{
							id: 'gain',
							label: 'Gain resource',
							effects: [
								{
									type: 'resource',
									method: 'add',
									params: { key: '$resource', amount: 1 },
								},
							],
						},
					],
				},
			],
		});
		const ctx = createTestEngine(content);
		ctx.activePlayer.ap = 1;
		const groups = getActionEffectGroups(action.id, ctx, {
			resource: 'custom-resource',
		});
		expect(groups).toHaveLength(1);
		expect(groups[0]?.id).toBe('target');
		expect(groups[0]?.options).toHaveLength(1);
		expect(groups[0]?.options[0]?.id).toBe('gain');
	});
});
