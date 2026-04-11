import { action, actionParams, actionTier, actionEffectGroup, actionEffectGroupOption } from '../src/infrastructure/builders';
import type { ActionEffectGroupDef } from '../src/infrastructure/builders';
import { DevelopActions, MetaCategory } from '../src/actions';
import { describe, expect, it } from 'vitest';

const developFarmActionId = DevelopActions.develop_farm;

describe('action effect group builder safeguards', () => {
	it('requires action effect groups to include options', () => {
		const group = actionEffectGroup('choose').title('Pick a project');
		expect(() => group.build()).toThrowError('Action effect group needs at least one option(). Add option(...) before build().');
	});

	it('prevents duplicate option ids within an effect group', () => {
		const group = actionEffectGroup('choose').title('Pick a project').option(actionEffectGroupOption('farm').label('Farm').action(developFarmActionId));

		expect(() => group.option(actionEffectGroupOption('farm').label('House').action(developFarmActionId))).toThrowError(
			'Action effect group option id "farm" already exists. Use unique option ids within a group.',
		);
	});

	it('prevents duplicate effect group ids within a tier', () => {
		const tier = actionTier().effectGroup(actionEffectGroup('choose').title('Pick a project').option(actionEffectGroupOption('farm').label('Farm').action(developFarmActionId)));

		expect(() => tier.effectGroup(actionEffectGroup('choose').title('Pick again').option(actionEffectGroupOption('house').label('House').action(developFarmActionId)))).toThrowError(
			'ActionTier effect group id "choose" already exists. Use unique group ids.',
		);
	});

	it('builds actions with effect groups', () => {
		const built = action()
			.id('group_action')
			.name('Group Action')
			.metaCategory(MetaCategory.Commands)
			.tier(1, (t) =>
				t.effectGroup(
					actionEffectGroup('choose')
						.title('Pick a project')
						.summary('Choose one follow-up action to resolve immediately.')
						.option(actionEffectGroupOption('farm').label('Farm').action(developFarmActionId).params(actionParams().id('farm').landId('$landId'))),
				),
			)
			.build();

		const tier = built.tiers[1];
		expect(tier?.effects).toHaveLength(1);
		const firstEffect = tier!.effects[0]!;
		expect('options' in firstEffect).toBe(true);
		const group = firstEffect as ActionEffectGroupDef;
		expect(group).toEqual({
			id: 'choose',
			title: 'Pick a project',
			summary: 'Choose one follow-up action to resolve immediately.',
			options: [
				{
					id: 'farm',
					label: 'Farm',
					actionId: developFarmActionId,
					params: { id: 'farm', landId: '$landId' },
				},
			],
		});
	});
});
