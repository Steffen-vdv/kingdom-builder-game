import {
	action,
	resourceParams,
	statParams,
	effect,
	requirement,
	compareRequirement,
	passiveParams,
	attackParams,
	transferParams,
	happinessTier,
	Types,
	PassiveMethods,
} from '../src/config/builders';
import { RESOURCES, type ResourceKey } from '../src/resources';
import { STATS, type StatKey } from '../src/stats';
import { describe, expect, it } from 'vitest';

const firstResourceKey = Object.keys(RESOURCES)[0] as ResourceKey;
const firstStatKey = Object.keys(STATS)[0] as StatKey;

const buildTierPassiveEffect = () =>
	effect()
		.type(Types.Passive)
		.method(PassiveMethods.ADD)
		.params(passiveParams().id('passive:test').build())
		.build();

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
		expect(() =>
			compareRequirement().operator('lt').right(5).build(),
		).toThrowError(
			'Compare requirement is missing left(). Call left(...) before build().',
		);
		expect(() =>
			compareRequirement().left(1).operator('lt').build(),
		).toThrowError(
			'Compare requirement is missing right(). Call right(...) before build().',
		);
		expect(() => compareRequirement().left(1).right(2).build()).toThrowError(
			'Compare requirement is missing operator(). Call operator(...) before build().',
		);
		expect(() => {
			const builder = compareRequirement().left(1);
			builder.left(2);
		}).toThrowError(
			'Compare requirement already set left(). Remove the extra left() call.',
		);
		expect(() => {
			const builder = compareRequirement().right(2);
			builder.right(3);
		}).toThrowError(
			'Compare requirement already set right(). Remove the extra right() call.',
		);
		expect(() => {
			const builder = compareRequirement().operator('lt');
			builder.operator('gt');
		}).toThrowError(
			'Compare requirement already set operator(). Remove the extra operator() call.',
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
			happinessTier().range(0, 1).passive(buildTierPassiveEffect()).build(),
		).toThrowError(
			"Happiness tier is missing id(). Call id('your-tier-id') before build().",
		);
	});

	it('rejects invalid happiness tier ranges', () => {
		expect(() =>
			happinessTier('tier:test')
				.range(5, 3)
				.passive(buildTierPassiveEffect())
				.build(),
		).toThrowError(
			'Happiness tier range(min, max?) requires max to be greater than or equal to min.',
		);
	});

	it('allows happiness tiers to omit a passive payload', () => {
		const tier = happinessTier('tier:test').range(0, 1).build();
		expect(tier.enterEffects).toBeUndefined();
		expect(tier.exitEffects).toBeUndefined();
		expect(tier.preview).toBeUndefined();
	});

	it('requires tier passives to provide an id', () => {
		expect(() =>
			happinessTier('tier:test')
				.range(0, 1)
				.passive(effect().type(Types.Passive).method(PassiveMethods.ADD))
				.build(),
		).toThrowError(
			'Happiness tier passive(...) requires the passive:add effect to include params.id.',
		);
	});

	it('verifies skipStep receives both identifiers', () => {
		expect(() =>
			passiveParams().id('passive:test').skipStep('', 'step'),
		).toThrowError(
			'Passive params skipStep(...) requires both phaseId and stepId. Provide both values when calling skipStep().',
		);
	});
});
