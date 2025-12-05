import { describe, it, expect } from 'vitest';
import {
	advance,
	getActionCosts,
	performAction,
} from '@kingdom-builder/engine';
import { resolveActionEffects } from '@kingdom-builder/protocol';
import { logContent } from '@kingdom-builder/web/translation/content';
import { Resource } from '@kingdom-builder/contents';
import { createTestEngine } from '../../packages/engine/tests/helpers';
import {
	Registry,
	type ActionConfig,
	type ActionEffectGroup,
} from '@kingdom-builder/protocol';
import {
	actionEffectGroup,
	actionEffectGroupOption,
} from '../../packages/contents/src/config/builders';

describe('action effect groups integration', () => {
	function setup() {
		const rewardAmount = 4;
		const rewardAction: ActionConfig = {
			id: 'reward_action',
			name: 'Grant Gold',
			baseCosts: {},
			effects: [
				{
					type: 'resource',
					method: 'add',
					params: {
						resourceId: Resource.gold,
						change: { type: 'amount', amount: rewardAmount },
					},
				},
			],
		};
		const alternateAction: ActionConfig = {
			id: 'mood_action',
			name: 'Lift Morale',
			baseCosts: {},
			effects: [
				{
					type: 'resource',
					method: 'add',
					params: {
						resourceId: Resource.happiness,
						change: { type: 'amount', amount: 1 },
					},
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
			baseCosts: {},
			effects: [group],
		};
		const actions = new Registry<ActionConfig>();
		actions.add(rewardAction.id, rewardAction);
		actions.add(alternateAction.id, alternateAction);
		actions.add(chooser.id, chooser);
		const engineContext = createTestEngine({ actions });
		while (engineContext.game.currentPhase !== 'main') {
			advance(engineContext);
		}
		const stored = engineContext.actions.get(chooser.id);
		if (!stored.effects.some((effect) => 'options' in (effect as object))) {
			throw new Error('Test setup failed: action lacks effect group entry');
		}
		const unresolved = resolveActionEffects(stored);
		if (unresolved.missingSelections.length === 0) {
			throw new Error(
				'Test setup failed: effect group should require a choice',
			);
		}
		const player = engineContext.activePlayer;
		player.resourceValues[Resource.ap] = 5;
		player.resourceValues[Resource.gold] = 0;
		player.resourceValues[Resource.happiness] = 0;
		return { engineContext, chooser, group, rewardAmount };
	}

	it('requires explicit selections for effect groups', () => {
		const { engineContext, chooser, group } = setup();
		const costBag = getActionCosts(chooser.id, engineContext);
		// AP cost is now applied globally by the action cost system (1 AP default)
		expect(costBag[Resource.ap] ?? 0).toBe(1);
		expect(() => performAction(chooser.id, engineContext)).toThrowError(
			new RegExp(group.id),
		);
	});

	it('applies chosen option effects and preserves action traces', () => {
		const { engineContext, chooser, group, rewardAmount } = setup();
		const params = {
			choices: {
				[group.id]: { optionId: 'gold_reward' },
			},
		} as const;
		const beforeGold =
			engineContext.activePlayer.resourceValues[Resource.gold] ?? 0;
		const traces = performAction(chooser.id, engineContext, params);
		expect(engineContext.activePlayer.resourceValues[Resource.gold]).toBe(
			beforeGold + rewardAmount,
		);
		expect(traces).toHaveLength(1);
		const trace = traces[0];
		const delta =
			(trace.after.resources[Resource.gold] ?? 0) -
			(trace.before.resources[Resource.gold] ?? 0);
		expect(delta).toBe(rewardAmount);
		const v2Delta =
			(trace.after.valuesV2[Resource.gold] ?? 0) -
			(trace.before.valuesV2[Resource.gold] ?? 0);
		expect(v2Delta).toBe(rewardAmount);
	});

	it('exposes effect groups for logging and summaries', () => {
		const { engineContext, chooser, group } = setup();
		const resolved = resolveActionEffects(chooser, {
			choices: { [group.id]: { optionId: 'mood_reward' } },
		});
		expect(resolved.groups).toHaveLength(1);
		expect(resolved.groups[0]?.group.id).toBe(group.id);
		const lines = logContent('action', chooser.id, engineContext, {
			choices: { [group.id]: { optionId: 'mood_reward' } },
		});
		const serialized = lines
			.map((entry) => (typeof entry === 'string' ? entry : entry.text))
			.join('\n');
		expect(serialized).toContain('Lift Morale');
	});
});
