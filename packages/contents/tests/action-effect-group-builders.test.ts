import {
	ActionBuilder,
	action,
	actionEffectGroup,
	actionEffectGroupOption,
	building,
} from '../src/config/builders';
import type { ActionEffectGroupDef } from '../src/config/builders';
import { describe, expect, it } from 'vitest';

describe('action effect group builder safeguards', () => {
	it('requires action effect groups to include options', () => {
		const group = actionEffectGroup('choose').title('Pick a project');
		expect(() => group.build()).toThrowError(
			'Action effect group needs at least one option(). Add option(...) before build().',
		);
	});

	it('prevents duplicate option ids within an effect group', () => {
		const group = actionEffectGroup('choose')
			.title('Pick a project')
			.option(actionEffectGroupOption('farm').label('Farm').action('develop'));

		expect(() =>
			group.option(
				actionEffectGroupOption('farm').label('House').action('develop'),
			),
		).toThrowError(
			'Action effect group option id "farm" already exists. Use unique option ids within a group.',
		);
	});

	it('prevents duplicate effect group ids on an action', () => {
		const builder = action().id('has_group').name('Has Group');
		builder.effectGroup(
			actionEffectGroup('choose')
				.title('Pick a project')
				.option(
					actionEffectGroupOption('farm').label('Farm').action('develop'),
				),
		);

		expect(() =>
			builder.effectGroup(
				actionEffectGroup('choose')
					.title('Pick again')
					.option(
						actionEffectGroupOption('house').label('House').action('develop'),
					),
			),
		).toThrowError(
			'Action effect group id "choose" already exists on this action. Use unique group ids.',
		);
	});

	it('blocks attaching effect groups to non-action builders', () => {
		const buildingBuilder = building();
		const group = actionEffectGroup('choose')
			.title('Pick a project')
			.option(actionEffectGroupOption('farm').label('Farm').action('develop'));

		expect(() =>
			(
				ActionBuilder.prototype.effectGroup as (
					this: ActionBuilder,
					group: unknown,
				) => ActionBuilder
			).call(buildingBuilder as unknown as ActionBuilder, group),
		).toThrowError(
			'Action effect groups can only be used on actions. Use action().effectGroup(...).',
		);
	});

	it('builds actions with effect groups', () => {
		const built = action()
			.id('group_action')
			.name('Group Action')
			.effectGroup(
				actionEffectGroup('choose')
					.title('Pick a project')
					.summary('Choose one follow-up action to resolve immediately.')
					.option(
						actionEffectGroupOption('farm')
							.label('Farm')
							.action('develop')
							.param('id', 'farm')
							.param('landId', '$landId'),
					),
			)
			.build();

		expect(built.effects).toHaveLength(1);
		expect('options' in built.effects[0]).toBe(true);
		const group = built.effects[0] as ActionEffectGroupDef;
		expect(group).toEqual({
			id: 'choose',
			title: 'Pick a project',
			summary: 'Choose one follow-up action to resolve immediately.',
			options: [
				{
					id: 'farm',
					label: 'Farm',
					actionId: 'develop',
					params: { id: 'farm', landId: '$landId' },
				},
			],
		});
	});
});
