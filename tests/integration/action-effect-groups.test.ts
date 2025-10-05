import { describe, it, expect } from 'vitest';
import {
	advance,
	getActionCosts,
	performAction,
	resolveActionEffects,
} from '@kingdom-builder/engine';
import { logContent } from '@kingdom-builder/web/translation/content';
import { Resource } from '@kingdom-builder/contents';
import { createTestEngine } from '../../packages/engine/tests/helpers';
import { Registry } from '@kingdom-builder/engine/registry';
import type { ActionConfig } from '@kingdom-builder/protocol';
import {
	actionEffectGroup,
	actionEffectGroupOption,
} from '../../packages/contents/src/config/builders';
import type { ActionEffectGroup } from '@kingdom-builder/engine';

describe('action effect groups integration', () => {
	function setup() {
		const rewardAmount = 4;
		const rewardAction: ActionConfig = {
			id: 'reward_action',
			name: 'Grant Gold',
			baseCosts: { [Resource.ap]: 0 },
			effects: [
				{
					type: 'resource',
					method: 'add',
					params: { key: Resource.gold, amount: rewardAmount },
				},
			],
		};
		const alternateAction: ActionConfig = {
			id: 'mood_action',
			name: 'Lift Morale',
			baseCosts: { [Resource.ap]: 0 },
			effects: [
				{
					type: 'resource',
					method: 'add',
					params: { key: Resource.happiness, amount: 1 },
				},
			],
		};
		const group: ActionEffectGroup = actionEffectGroup('reward_group')
			.title('Select decree')
			.option(
				actionEffectGroupOption('gold_reward')
					.label('Grant gold')
					.action(rewardAction.id),
			)
			.option(
				actionEffectGroupOption('mood_reward')
					.label('Lift morale')
					.action(alternateAction.id),
			)
			.build();
		const chooser: ActionConfig = {
			id: 'royal_directive',
			name: 'Royal directive',
			baseCosts: { [Resource.ap]: 0 },
			effects: [group],
		};
		const actions = new Registry<ActionConfig>();
		actions.add(rewardAction.id, rewardAction);
		actions.add(alternateAction.id, alternateAction);
		actions.add(chooser.id, chooser);
		const ctx = createTestEngine({ actions });
		while (ctx.game.currentPhase !== 'main') {
			advance(ctx);
		}
		const stored = ctx.actions.get(chooser.id);
		if (!stored.effects.some((effect) => 'options' in (effect as object))) {
			throw new Error('Test setup failed: action lacks effect group entry');
		}
		const unresolved = resolveActionEffects(stored);
		if (unresolved.missingSelections.length === 0) {
			throw new Error(
				'Test setup failed: effect group should require a choice',
			);
		}
		ctx.activePlayer.resources[Resource.ap] = 5;
		ctx.activePlayer.resources[Resource.gold] = 0;
		ctx.activePlayer.resources[Resource.happiness] = 0;
		return { ctx, chooser, group, rewardAmount };
	}

	it('requires explicit selections for effect groups', () => {
		const { ctx, chooser, group } = setup();
		const costBag = getActionCosts(chooser.id, ctx);
		expect(costBag[Resource.ap] ?? 0).toBe(0);
		expect(() => performAction(chooser.id, ctx)).toThrowError(
			new RegExp(group.id),
		);
	});

	it('applies chosen option effects and preserves action traces', () => {
		const { ctx, chooser, group, rewardAmount } = setup();
		const params = {
			choices: {
				[group.id]: { optionId: 'gold_reward' },
			},
		} as const;
		const beforeGold = ctx.activePlayer.resources[Resource.gold];
		const traces = performAction(chooser.id, ctx, params);
		expect(ctx.activePlayer.resources[Resource.gold]).toBe(
			beforeGold + rewardAmount,
		);
		expect(traces).toHaveLength(1);
		const trace = traces[0];
		const delta =
			(trace.after.resources[Resource.gold] ?? 0) -
			(trace.before.resources[Resource.gold] ?? 0);
		expect(delta).toBe(rewardAmount);
	});

	it('exposes effect groups for logging and summaries', () => {
		const { ctx, chooser, group } = setup();
		const resolved = resolveActionEffects(chooser, {
			choices: { [group.id]: { optionId: 'mood_reward' } },
		});
		expect(resolved.groups).toHaveLength(1);
		expect(resolved.groups[0]?.group.id).toBe(group.id);
		const lines = logContent('action', chooser.id, ctx, {
			choices: { [group.id]: { optionId: 'mood_reward' } },
		});
		const serialized = lines.join('\n');
		expect(serialized).toContain('Lift morale');
	});
});
