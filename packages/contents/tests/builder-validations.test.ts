import { action, actionParams, effect, requirement, compareRequirement, passiveParams, attackParams, happinessTier, populationParams } from '../src/config/builders';
import { DEVELOPMENT_ACTION_IDS } from '../src/actions';
import { Types, PassiveMethods } from '../src/config/builderShared';
import { describe, expect, it } from 'vitest';

const firstDevelopmentActionId = DEVELOPMENT_ACTION_IDS[0];

if (!firstDevelopmentActionId) {
	throw new Error('Missing development action id for builder safeguard tests.');
}

const buildTierPassiveEffect = () => effect().type(Types.Passive).method(PassiveMethods.ADD).params(passiveParams().id('passive:test').build()).build();

describe('content builder safeguards', () => {
	it('explains when an action id is missing', () => {
		expect(() => action().name('Example').build()).toThrowError("Action is missing id(). Call id('unique-id') before build().");
	});

	it('blocks duplicate action ids', () => {
		expect(() => action().id('demo').id('again')).toThrowError('Action already has an id(). Remove the extra id() call.');
	});

	it('requires action params to declare an id', () => {
		expect(() => actionParams().build()).toThrowError('Action effect params is missing id(). Call id("your-action-id") before build().');
	});

	it('prevents duplicate action param setters', () => {
		const builder = actionParams().id(firstDevelopmentActionId);
		expect(() => builder.id('again')).toThrowError('Action effect params already set id(). Remove the extra id() call.');
		expect(() => actionParams().landId('$land').landId('$land')).toThrowError('Action effect params already set landId(). Remove the extra landId() call.');
	});

	it('reports missing action names', () => {
		expect(() => action().id('example').build()).toThrowError("Action is missing name(). Call name('Readable name') before build().");
	});

	it('flags empty effects', () => {
		expect(() => effect().build()).toThrowError('Effect is missing type() and method(). Call effect(Types.X, Methods.Y) or add nested effect(...) calls before build().');
	});

	it('guides requirement configuration mistakes', () => {
		expect(() => requirement().method('compare').build()).toThrowError('Requirement is missing type(). Call type("your-requirement") before build().');
		expect(() => compareRequirement().operator('lt').right(5).build()).toThrowError('Compare requirement is missing left(). Call left(...) before build().');
		expect(() => compareRequirement().left(1).operator('lt').build()).toThrowError('Compare requirement is missing right(). Call right(...) before build().');
		expect(() => compareRequirement().left(1).right(2).build()).toThrowError('Compare requirement is missing operator(). Call operator(...) before build().');
		expect(() => {
			const builder = compareRequirement().left(1);
			builder.left(2);
		}).toThrowError('Compare requirement already set left(). Remove the extra left() call.');
		expect(() => {
			const builder = compareRequirement().right(2);
			builder.right(3);
		}).toThrowError('Compare requirement already set right(). Remove the extra right() call.');
		expect(() => {
			const builder = compareRequirement().operator('lt');
			builder.operator('gt');
		}).toThrowError('Compare requirement already set operator(). Remove the extra operator() call.');
	});

	it('requires passives to declare an id', () => {
		expect(() => passiveParams().build()).toThrowError('Passive effect is missing id(). Call id("your-passive-id") so it can be referenced later.');
	});

	it('builds tiered resource metadata with helper', () => {
		const params = passiveParams()
			.id('passive:test')
			.tieredResourceSource({
				tierId: 'tier:test',
				removalDetail: 'the sun shines',
				summaryToken: 'tier.summary',
				name: 'Tier Test',
				icon: '✨',
			})
			.build();
		expect(params.meta).toEqual({
			source: {
				type: 'tiered-resource',
				id: 'tier:test',
				labelToken: 'tier.summary',
				name: 'Tier Test',
				icon: '✨',
			},
			removal: {
				token: 'the sun shines',
				text: 'Active as long as the sun shines',
			},
		});
	});

	it('ensures attacks have a single target', () => {
		expect(() => attackParams().build()).toThrowError('Attack effect is missing a target. Call targetResource(...), targetStat(...), or targetBuilding(...) once.');
	});

	it('supports building targets for attacks', () => {
		const params = attackParams().targetBuilding('test-building').build();
		expect(params).toEqual({
			target: { type: 'building', id: 'test-building' },
		});
	});

	it('requires happiness tiers to declare an id', () => {
		expect(() => happinessTier().range(0, 1).passive(buildTierPassiveEffect()).build()).toThrowError("Happiness tier is missing id(). Call id('your-tier-id') before build().");
	});

	it('rejects invalid happiness tier ranges', () => {
		expect(() => happinessTier('tier:test').range(5, 3).passive(buildTierPassiveEffect()).build()).toThrowError('Happiness tier range(min, max?) requires max to be greater than or equal to min.');
	});

	it('allows happiness tiers to omit a passive payload', () => {
		const tier = happinessTier('tier:test').range(0, 1).build();
		expect(tier.enterEffects).toBeUndefined();
		expect(tier.exitEffects).toBeUndefined();
		expect(tier.preview).toBeUndefined();
	});

	it('requires tier passives to provide an id', () => {
		expect(() => happinessTier('tier:test').range(0, 1).passive(effect().type(Types.Passive).method(PassiveMethods.ADD)).build()).toThrowError(
			'Happiness tier passive(...) requires the passive:add effect to include params.id.',
		);
	});

	it('verifies skipStep receives both identifiers', () => {
		expect(() => passiveParams().id('passive:test').skipStep('', 'step')).toThrowError('Passive params skipStep(...) requires both phaseId and stepId. Provide both values when calling skipStep().');
	});
	it('supports placeholder strings in population params while requiring role()', () => {
		const params = populationParams().role('$role').build();
		expect(params).toEqual({ role: '$role' });
		expect(() => populationParams().build()).toThrowError('Population effect is missing role(). Call role(PopulationRole.yourChoice) to choose who is affected.');
	});
});
