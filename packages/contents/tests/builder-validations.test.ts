import { action, actionParams, effect, requirement, compareRequirement, passiveParams, attackParams, happinessTier, actionMetaCategory } from '../src/infrastructure/builders';
import { DEVELOPMENT_ACTION_IDS } from '../src/actions';
import { Types, PassiveMethods } from '@kingdom-builder/contents-sdk';
import { MetaCategory } from '../src/constants';
import { describe, expect, it } from 'vitest';

const firstDevelopmentActionId = DEVELOPMENT_ACTION_IDS[0];

if (!firstDevelopmentActionId) {
	throw new Error('Missing development action id for builder safeguard tests.');
}

const buildTierPassiveEffect = () => effect().type(Types.Passive).method(PassiveMethods.ADD).params(passiveParams().id('passive:test').build()).build();

describe('content builder safeguards', () => {
	it('explains when an action id is missing', () => {
		expect(() => action().name('Example').metaCategory(MetaCategory.Commands).build()).toThrowError("Action is missing id(). Call id('unique-id') before build().");
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
		expect(() => action().id('example').metaCategory(MetaCategory.Commands).build()).toThrowError("Action is missing name(). Call name('Readable name') before build().");
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
		expect(() => attackParams().build()).toThrowError('Attack effect is missing a target. Call targetResource(...) or targetBuilding(...) once.');
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

	it('requires actions to specify metaCategory', () => {
		expect(() => action().id('test').name('Test').build()).toThrowError('Action is missing metaCategory(). Call metaCategory() before build().');
	});

	it('blocks duplicate metaCategory calls on actions', () => {
		const builder = action().metaCategory(MetaCategory.Commands);
		expect(() => builder.metaCategory(MetaCategory.Research)).toThrowError('Action already has metaCategory(). Remove the extra call.');
	});
});

describe('action meta-category builder safeguards', () => {
	const validMetaCategory = () => actionMetaCategory().id('meta:test').label('Test').icon('🧪').bindingResource('resource:test').costModel('global', 1).visibilityTrigger('always').order(0);

	it('requires meta-category to specify id', () => {
		expect(() => actionMetaCategory().label('Test').icon('🧪').bindingResource('resource:test').costModel('global', 1).visibilityTrigger('always').order(0).build()).toThrowError(
			"Action meta-category is missing id(). Call id('unique-id') before build().",
		);
	});

	it('requires meta-category to specify label', () => {
		expect(() => actionMetaCategory().id('meta:test').icon('🧪').bindingResource('resource:test').costModel('global', 1).visibilityTrigger('always').order(0).build()).toThrowError(
			"Action meta-category is missing label(). Call label('Readable label') before build().",
		);
	});

	it('requires meta-category to specify icon', () => {
		expect(() => actionMetaCategory().id('meta:test').label('Test').bindingResource('resource:test').costModel('global', 1).visibilityTrigger('always').order(0).build()).toThrowError(
			"Action meta-category is missing icon(). Call icon('icon-id') before build().",
		);
	});

	it('requires meta-category to specify bindingResource', () => {
		expect(() => actionMetaCategory().id('meta:test').label('Test').icon('🧪').costModel('global', 1).visibilityTrigger('always').order(0).build()).toThrowError(
			"Action meta-category is missing bindingResource(). Call bindingResource('resource-id') before build().",
		);
	});

	it('requires meta-category to specify costModel', () => {
		expect(() => actionMetaCategory().id('meta:test').label('Test').icon('🧪').bindingResource('resource:test').visibilityTrigger('always').order(0).build()).toThrowError(
			"Action meta-category is missing costModel(). Call costModel('global', amount) or costModel('per-item') before build().",
		);
	});

	it('requires meta-category to specify visibilityTrigger', () => {
		expect(() => actionMetaCategory().id('meta:test').label('Test').icon('🧪').bindingResource('resource:test').costModel('global', 1).order(0).build()).toThrowError(
			"Action meta-category is missing visibilityTrigger(). Call visibilityTrigger('resource-touched') before build().",
		);
	});

	it('requires meta-category to specify order', () => {
		expect(() => actionMetaCategory().id('meta:test').label('Test').icon('🧪').bindingResource('resource:test').costModel('global', 1).visibilityTrigger('always').build()).toThrowError(
			'Action meta-category is missing order(). Call order(number) before build().',
		);
	});

	it('blocks duplicate id calls', () => {
		expect(() => actionMetaCategory().id('meta:test').id('meta:again')).toThrowError('Action meta-category already set id(). Remove the extra id() call.');
	});

	it('blocks duplicate label calls', () => {
		expect(() => actionMetaCategory().label('Test').label('Again')).toThrowError('Action meta-category already set label(). Remove the extra label() call.');
	});

	it('blocks duplicate icon calls', () => {
		expect(() => actionMetaCategory().icon('🧪').icon('🔬')).toThrowError('Action meta-category already set icon(). Remove the extra icon() call.');
	});

	it('blocks duplicate bindingResource calls', () => {
		expect(() => actionMetaCategory().bindingResource('r1').bindingResource('r2')).toThrowError('Action meta-category already set bindingResource(). Remove the extra call.');
	});

	it('blocks duplicate costModel calls', () => {
		expect(() => actionMetaCategory().costModel('global', 1).costModel('per-item')).toThrowError('Action meta-category already set costModel(). Remove the extra call.');
	});

	it('blocks duplicate visibilityTrigger calls', () => {
		expect(() => actionMetaCategory().visibilityTrigger('always').visibilityTrigger('resource-touched')).toThrowError('Action meta-category already set visibilityTrigger(). Remove the extra call.');
	});

	it('blocks duplicate order calls', () => {
		expect(() => actionMetaCategory().order(0).order(1)).toThrowError('Action meta-category already set order(). Remove the extra order() call.');
	});

	it('blocks duplicate categories calls', () => {
		expect(() => actionMetaCategory().categories('cat1').categories('cat2')).toThrowError('Action meta-category already set categories(). Remove the extra call.');
	});

	it('requires global cost model to have positive amount', () => {
		expect(() => actionMetaCategory().costModel('global', 0)).toThrowError('Action meta-category with global cost model requires a positive amount.');
		expect(() => actionMetaCategory().costModel('global', -1)).toThrowError('Action meta-category with global cost model requires a positive amount.');
	});

	it('rejects amount on per-item cost model', () => {
		// TypeScript overloads should prevent this, but runtime check still exists
		expect(() => (actionMetaCategory() as unknown as { costModel: (m: string, a: number) => void }).costModel('per-item', 1)).toThrowError(
			'Action meta-category with per-item cost model should not specify an amount.',
		);
	});

	it('builds valid meta-category with all required fields', () => {
		const config = validMetaCategory().build();
		expect(config).toEqual({
			id: 'meta:test',
			label: 'Test',
			icon: '🧪',
			bindingResourceId: 'resource:test',
			costModel: 'global',
			globalCostAmount: 1,
			visibilityTrigger: 'always',
			order: 0,
		});
	});

	it('builds per-item cost model without globalCostAmount', () => {
		const config = actionMetaCategory()
			.id('meta:research')
			.label('Research')
			.icon('🔬')
			.bindingResource('resource:research')
			.costModel('per-item')
			.visibilityTrigger('resource-touched')
			.order(1)
			.build();
		expect(config.costModel).toBe('per-item');
		expect(config.globalCostAmount).toBeUndefined();
	});

	it('includes optional categoryIds when specified', () => {
		const config = validMetaCategory().categories('cat:economy', 'cat:military').build();
		expect(config.categoryIds).toEqual(['cat:economy', 'cat:military']);
	});
});
