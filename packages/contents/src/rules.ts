import type { RuleSet } from '@kingdom-builder/engine/services';
import { Resource } from './resources';
import { Stat } from './stats';
import {
	Types,
	CostModMethods,
	ResultModMethods,
	StatMethods,
	costModParams,
	evaluationTarget,
	happinessTier,
	resultModParams,
	statParams,
	tierPassive,
} from './config/builders';

const GROWTH_PHASE_ID = 'growth';
const UPKEEP_PHASE_ID = 'upkeep';
const WAR_RECOVERY_STEP_ID = 'war-recovery';
const BUILD_ACTION_ID = 'build';

const DEVELOPMENT_EVALUATION = evaluationTarget('development');
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

const growthBonusEffect = (amount: number) =>
	({
		type: Types.Stat,
		method: StatMethods.ADD,
		params: statParams().key(Stat.growth).amount(amount).build(),
	}) as const;

const formatRemoval = (description: string) => `Removed when ${description}`;

export const RULES: RuleSet = {
	defaultActionAPCost: 1,
	absorptionCapPct: 1,
	absorptionRounding: 'down',
	tieredResourceKey: Resource.happiness,
	tierDefinitions: [
		happinessTier('happiness:tier:despair')
			.range(-10)
			.incomeMultiplier(0.5)
			.disableGrowth()
			.passive(
				tierPassive('passive:happiness:despair')
					.effect(incomeModifier('happiness:despair:income', -0.5))
					.skipPhase(GROWTH_PHASE_ID)
					.skipStep(UPKEEP_PHASE_ID, WAR_RECOVERY_STEP_ID)
					.text((text) => {
						const removalDetail = 'happiness rises to -9 or higher';
						text
							.summary(
								'💰 Income -50%. ⏭️ Skip Growth. 🛡️ War Recovery skipped.',
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
			.range(-9, -8)
			.incomeMultiplier(0.5)
			.disableGrowth()
			.passive(
				tierPassive('passive:happiness:misery')
					.effect(incomeModifier('happiness:misery:income', -0.5))
					.skipPhase(GROWTH_PHASE_ID)
					.text((text) => {
						const removalDetail = 'happiness leaves the -9 to -8 range';
						text
							.summary(
								'💰 Income -50%. ⏭️ Skip Growth while morale is desperate.',
							)
							.removal(formatRemoval(removalDetail));
						return text;
					}),
			)
			.display((display) =>
				display.removalCondition('happiness leaves the -9 to -8 range'),
			)
			.build(),
		happinessTier('happiness:tier:grim')
			.range(-7, -5)
			.incomeMultiplier(0.75)
			.disableGrowth()
			.passive(
				tierPassive('passive:happiness:grim')
					.effect(incomeModifier('happiness:grim:income', -0.25))
					.skipPhase(GROWTH_PHASE_ID)
					.text((text) => {
						const removalDetail = 'happiness leaves the -7 to -5 range';
						text
							.summary('💰 Income -25%. ⏭️ Skip Growth until spirits recover.')
							.removal(formatRemoval(removalDetail));
						return text;
					}),
			)
			.display((display) =>
				display.removalCondition('happiness leaves the -7 to -5 range'),
			)
			.build(),
		happinessTier('happiness:tier:unrest')
			.range(-4, -3)
			.incomeMultiplier(0.75)
			.passive(
				tierPassive('passive:happiness:unrest')
					.effect(incomeModifier('happiness:unrest:income', -0.25))
					.text((text) => {
						const removalDetail = 'happiness leaves the -4 to -3 range';
						text
							.summary('💰 Income -25% while unrest simmers.')
							.removal(formatRemoval(removalDetail));
						return text;
					}),
			)
			.display((display) =>
				display.removalCondition('happiness leaves the -4 to -3 range'),
			)
			.build(),
		happinessTier('happiness:tier:steady')
			.range(-2, 2)
			.incomeMultiplier(1)
			.passive(
				tierPassive('passive:happiness:steady').text((text) => {
					const removalDetail = 'happiness leaves the -2 to +2 range';
					text
						.summary('Morale is steady. No tier bonuses are active.')
						.removal(formatRemoval(removalDetail));
					return text;
				}),
			)
			.display((display) =>
				display.removalCondition('happiness leaves the -2 to +2 range'),
			)
			.build(),
		happinessTier('happiness:tier:content')
			.range(3, 4)
			.incomeMultiplier(1.2)
			.passive(
				tierPassive('passive:happiness:content')
					.effect(incomeModifier('happiness:content:income', 0.2))
					.text((text) => {
						const removalDetail = 'happiness leaves the +3 to +4 range';
						text
							.summary('💰 Income +20% while the realm is content.')
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
			.growthBonusPct(0.2)
			.passive(
				tierPassive('passive:happiness:ecstatic')
					.effect(incomeModifier('happiness:ecstatic:income', 0.5))
					.effect(buildingDiscountModifier('happiness:ecstatic:build-discount'))
					.effect(growthBonusEffect(0.2))
					.text((text) => {
						const removalDetail = 'happiness drops below +10';
						text
							.summary(
								'💰 Income +50%. 🏛️ Building costs reduced by 20%. 📈 Growth +20%.',
							)
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
