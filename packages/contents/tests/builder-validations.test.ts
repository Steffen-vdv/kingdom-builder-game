import {
	ActionBuilder,
	action,
	actionEffectGroup,
	actionEffectGroupOption,
	building,
	resourceParams,
	statParams,
	effect,
	requirement,
	passiveParams,
	attackParams,
	transferParams,
	happinessTier,
	tierPassive,
} from '../src/config/builders';
import type { ActionEffectGroupDef } from '../src/config/builders';
import { RESOURCES, type ResourceKey } from '../src/resources';
import { STATS, type StatKey } from '../src/stats';
import { describe, expect, it } from 'vitest';

const firstResourceKey = Object.keys(RESOURCES)[0] as ResourceKey;
const firstStatKey = Object.keys(STATS)[0] as StatKey;

describe('content builder safeguards', () => {
	it('explains when an action id is missing', () => {
		expect(() => action().name('Example').build()).toThrowError(
			"Action is missing id(). Call id('unique-id') before build().",
		);
	});

	it('blocks duplicate action ids', () => {
		expect(() => action().id('demo').id('again')).toThrowError(
			'Action already has an id(). Remove the extra id() call.',
		);
	});

	it('reports missing action names', () => {
		expect(() => action().id('example').build()).toThrowError(
			"Action is missing name(). Call name('Readable name') before build().",
		);
	});

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

	it('prevents mixing amount and percent for resource changes', () => {
		const params = resourceParams().key(firstResourceKey).amount(2);
		expect(() => params.percent(10)).toThrowError(
			'Resource change cannot use both amount() and percent(). Choose one of them.',
		);
	});

	it('requires an amount or percent for resource changes', () => {
		expect(() => resourceParams().key(firstResourceKey).build()).toThrowError(
			'Resource change needs exactly one of amount() or percent(). Pick how much the resource should change.',
		);
	});

	it('explains stat change conflicts clearly', () => {
		const params = statParams().key(firstStatKey).percent(10);
		expect(() => params.amount(1)).toThrowError(
			'Stat change cannot mix amount() with percent() or percentFromStat(). Pick one approach to describe the change.',
		);
	});

	it('flags empty effects', () => {
		expect(() => effect().build()).toThrowError(
			'Effect is missing type() and method(). Call effect(Types.X, Methods.Y) or add nested effect(...) calls before build().',
		);
	});

	it('guides requirement configuration mistakes', () => {
		expect(() => requirement().method('compare').build()).toThrowError(
			'Requirement is missing type(). Call type("your-requirement") before build().',
		);
	});

	it('requires passives to declare an id', () => {
		expect(() => passiveParams().build()).toThrowError(
			'Passive effect is missing id(). Call id("your-passive-id") so it can be referenced later.',
		);
	});

	it('ensures attacks have a single target', () => {
		expect(() => attackParams().build()).toThrowError(
			'Attack effect is missing a target. Call targetResource(...), targetStat(...), or targetBuilding(...) once.',
		);
	});

	it('supports building targets for attacks', () => {
		const params = attackParams().targetBuilding('test-building').build();
		expect(params).toEqual({
			target: { type: 'building', id: 'test-building' },
		});
	});

	it('demands transfer amounts', () => {
		expect(() => transferParams().key(firstResourceKey).build()).toThrowError(
			'Resource transfer is missing percent(). Call percent(amount) to choose how much to move.',
		);
	});

	it('requires happiness tiers to declare an id', () => {
		expect(() =>
			happinessTier().range(0, 1).passive(tierPassive('passive:test')).build(),
		).toThrowError(
			"Happiness tier is missing id(). Call id('your-tier-id') before build().",
		);
	});

	it('rejects invalid happiness tier ranges', () => {
		expect(() =>
			happinessTier('tier:test')
				.range(5, 3)
				.passive(tierPassive('passive:test'))
				.build(),
		).toThrowError(
			'Happiness tier range(min, max?) requires max to be greater than or equal to min.',
		);
	});

	it('demands happiness tiers to define a passive payload', () => {
		expect(() => happinessTier('tier:test').range(0, 1).build()).toThrowError(
			'Happiness tier is missing passive(). Call passive(...) with tierPassive(...) before build().',
		);
	});

	it('requires tier passives to provide an id', () => {
		expect(() =>
			happinessTier('tier:test').range(0, 1).passive(tierPassive()).build(),
		).toThrowError(
			'Happiness tier passive is missing id(). Call id("your-passive-id") before build().',
		);
	});

	it('verifies skipStep receives both identifiers', () => {
		expect(() => tierPassive('passive:test').skipStep('', 'step')).toThrowError(
			'Happiness tier passive skipStep(...) requires both phaseId and stepId. Provide both values when calling skipStep().',
		);
	});
});
