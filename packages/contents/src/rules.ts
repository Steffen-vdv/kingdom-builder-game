import type { RuleSet } from '@kingdom-builder/engine/services';
import { Resource } from './resources';
import { PopulationRole } from './populationRoles';
import {
	Types,
	CostModMethods,
	ResultModMethods,
	costModParams,
	evaluationTarget,
	happinessTier,
	resultModParams,
	tierPassive,
} from './config/builders';

const GROWTH_PHASE_ID = 'growth';
const RAISE_STRENGTH_STEP_ID = 'raise-strength';
const BUILD_ACTION_ID = 'build';

const DEVELOPMENT_EVALUATION = evaluationTarget('development');
const COUNCIL_EVALUATION = evaluationTarget('population').id(
	PopulationRole.Council,
);

const incomeModifier = (id: string, percent: number) =>
	({
		type: Types.ResultMod,
		method: ResultModMethods.ADD,
		params: resultModParams()
			.id(id)
			.evaluation(DEVELOPMENT_EVALUATION)
			.percent(percent)
			.build(),
	}) as const;

const buildingDiscountModifier = (id: string) =>
	({
		type: Types.CostMod,
		method: CostModMethods.ADD,
		params: costModParams()
			.id(id)
			.actionId(BUILD_ACTION_ID)
			.key(Resource.gold)
			.percent(-0.2)
			.build(),
	}) as const;

const councilApPenaltyModifier = (id: string) =>
	({
		type: Types.ResultMod,
		method: ResultModMethods.ADD,
		params: resultModParams()
			.id(id)
			.evaluation(COUNCIL_EVALUATION)
			.percent(-0.5)
			.build(),
	}) as const;

const formatRemoval = (description: string) => `Removed when ${description}`;

export const RULES: RuleSet = {
	defaultActionAPCost: 1,
	absorptionCapPct: 1,
	absorptionRounding: 'down',
	tieredResourceKey: Resource.happiness,
	tierDefinitions: [
		happinessTier('happiness:tier:despair')
			.range(-10, -9)
			.incomeMultiplier(0.5)
			.passive(
				tierPassive('passive:happiness:despair')
					.effect(incomeModifier('happiness:despair:income', -0.5))
					.effect(councilApPenaltyModifier('happiness:despair:council-ap'))
					.skipStep(GROWTH_PHASE_ID, RAISE_STRENGTH_STEP_ID)
					.text((text) => {
						const removalDetail = 'happiness rises to -9 or higher';
						text
							.summary(
								'💰 Income -50%. 📉 Skip Raise Strength. ⚖️ Councils grant half ⚡.',
							)
							.removal(formatRemoval(removalDetail));
						return text;
					}),
			)
			.display((display) =>
				display.removalCondition('happiness rises to -9 or higher'),
			)
			.build(),
		happinessTier('happiness:tier:misery')
			.range(-8, -6)
			.incomeMultiplier(0.5)
			.passive(
				tierPassive('passive:happiness:misery')
					.effect(incomeModifier('happiness:misery:income', -0.5))
					.skipStep(GROWTH_PHASE_ID, RAISE_STRENGTH_STEP_ID)
					.text((text) => {
						const removalDetail = 'happiness leaves the -8 to -6 range';
						text
							.summary(
								'💰 Income -50%. 📉 Skip Raise Strength while morale is desperate.',
							)
							.removal(formatRemoval(removalDetail));
						return text;
					}),
			)
			.display((display) =>
				display.removalCondition('happiness leaves the -8 to -6 range'),
			)
			.build(),
		happinessTier('happiness:tier:grim')
			.range(-5, -4)
			.incomeMultiplier(0.75)
			.passive(
				tierPassive('passive:happiness:grim')
					.effect(incomeModifier('happiness:grim:income', -0.25))
					.skipStep(GROWTH_PHASE_ID, RAISE_STRENGTH_STEP_ID)
					.text((text) => {
						const removalDetail = 'happiness leaves the -5 to -4 range';
						text
							.summary(
								'💰 Income -25%. 📉 Skip Raise Strength until spirits recover.',
							)
							.removal(formatRemoval(removalDetail));
						return text;
					}),
			)
			.display((display) =>
				display.removalCondition('happiness leaves the -5 to -4 range'),
			)
			.build(),
		happinessTier('happiness:tier:unrest')
			.range(-3, -1)
			.incomeMultiplier(0.75)
			.passive(
				tierPassive('passive:happiness:unrest')
					.effect(incomeModifier('happiness:unrest:income', -0.25))
					.text((text) => {
						const removalDetail = 'happiness leaves the -3 to -1 range';
						text
							.summary('💰 Income -25% while unrest simmers.')
							.removal(formatRemoval(removalDetail));
						return text;
					}),
			)
			.display((display) =>
				display.removalCondition('happiness leaves the -3 to -1 range'),
			)
			.build(),
		happinessTier('happiness:tier:steady')
			.range(0, 2)
			.incomeMultiplier(1)
			.passive(
				tierPassive('passive:happiness:steady').text((text) => {
					const removalDetail = 'happiness leaves the 0 to 2 range';
					text
						.summary('Morale is steady. No tier bonuses are active.')
						.removal(formatRemoval(removalDetail));
					return text;
				}),
			)
			.display((display) =>
				display.removalCondition('happiness leaves the 0 to 2 range'),
			)
			.build(),
		happinessTier('happiness:tier:content')
			.range(3, 4)
			.incomeMultiplier(1.25)
			.passive(
				tierPassive('passive:happiness:content')
					.effect(incomeModifier('happiness:content:income', 0.25))
					.text((text) => {
						const removalDetail = 'happiness leaves the +3 to +4 range';
						text
							.summary('💰 Income +25% while the realm is content.')
							.removal(formatRemoval(removalDetail));
						return text;
					}),
			)
			.display((display) =>
				display.removalCondition('happiness leaves the +3 to +4 range'),
			)
			.build(),
		happinessTier('happiness:tier:joyful')
			.range(5, 7)
			.incomeMultiplier(1.25)
			.buildingDiscountPct(0.2)
			.passive(
				tierPassive('passive:happiness:joyful')
					.effect(incomeModifier('happiness:joyful:income', 0.25))
					.effect(buildingDiscountModifier('happiness:joyful:build-discount'))
					.text((text) => {
						const removalDetail = 'happiness leaves the +5 to +7 range';
						text
							.summary('💰 Income +25%. 🏛️ Building costs reduced by 20%.')
							.removal(formatRemoval(removalDetail));
						return text;
					}),
			)
			.display((display) =>
				display.removalCondition('happiness leaves the +5 to +7 range'),
			)
			.build(),
		happinessTier('happiness:tier:elated')
			.range(8, 9)
			.incomeMultiplier(1.5)
			.buildingDiscountPct(0.2)
			.passive(
				tierPassive('passive:happiness:elated')
					.effect(incomeModifier('happiness:elated:income', 0.5))
					.effect(buildingDiscountModifier('happiness:elated:build-discount'))
					.text((text) => {
						const removalDetail = 'happiness leaves the +8 to +9 range';
						text
							.summary('💰 Income +50%. 🏛️ Building costs reduced by 20%.')
							.removal(formatRemoval(removalDetail));
						return text;
					}),
			)
			.display((display) =>
				display.removalCondition('happiness leaves the +8 to +9 range'),
			)
			.build(),
		happinessTier('happiness:tier:ecstatic')
			.range(10)
			.incomeMultiplier(1.5)
			.buildingDiscountPct(0.2)
			.passive(
				tierPassive('passive:happiness:ecstatic')
					.effect(incomeModifier('happiness:ecstatic:income', 0.5))
					.effect(buildingDiscountModifier('happiness:ecstatic:build-discount'))
					.text((text) => {
						const removalDetail = 'happiness drops below +10';
						text
							.summary('💰 Income +50%. 🏛️ Building costs reduced by 20%.')
							.removal(formatRemoval(removalDetail));
						return text;
					}),
			)
			.display((display) =>
				display.removalCondition('happiness drops below +10'),
			)
			.build(),
	],
	slotsPerNewLand: 1,
	maxSlotsPerLand: 2,
	basePopulationCap: 1,
};
