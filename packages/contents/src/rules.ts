/* eslint-disable max-lines */
import type { EffectConfig } from '@kingdom-builder/engine/config/schema';
import type {
	PassiveMetadata,
	RuleSet,
} from '@kingdom-builder/engine/services';
import { Resource } from './resources';
import { Stat } from './stats';
import {
	Types,
	CostModMethods,
	PassiveMethods,
	ResultModMethods,
	StatMethods,
	costModParams,
	evaluationTarget,
	happinessTier,
	resultModParams,
	statParams,
	passiveParams,
	effect,
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

type TierSkipConfig = {
	phases?: string[];
	steps?: Array<{ phaseId: string; stepId: string }>;
};

function buildTierPassiveEffect({
	tierId,
	passiveId,
	summary,
	removalText,
	removalCondition,
	icon,
	summaryToken,
	nestedEffects = [],
	skip,
}: {
	tierId: string;
	passiveId: string;
	summary?: string;
	removalText?: string;
	removalCondition?: string;
	icon?: string;
	summaryToken?: string;
	nestedEffects?: EffectConfig[];
	skip?: TierSkipConfig;
}): EffectConfig {
	const paramsBuilder = passiveParams().id(passiveId);
	paramsBuilder.detail(summary ?? tierId);
	const meta: PassiveMetadata = {
		source: {
			type: 'tiered-resource',
			id: tierId,
		},
	};
	if (icon) {
		meta.source!.icon = icon;
	}
	if (summaryToken) {
		meta.source!.labelToken = summaryToken;
	}
	if (removalCondition || removalText) {
		const removal: PassiveMetadata['removal'] = {};
		if (removalCondition) {
			removal.token = removalCondition;
		}
		if (removalText) {
			removal.text = removalText;
		}
		if (Object.keys(removal).length > 0) {
			meta.removal = removal;
		}
	}
	paramsBuilder.meta(meta);

	const passiveEffectBuilder = effect(Types.Passive, PassiveMethods.ADD);
	passiveEffectBuilder.params(paramsBuilder.build());

	const skipPhases = skip?.phases ?? [];
	const skipSteps = skip?.steps ?? [];
	if (skipPhases.length > 0 || skipSteps.length > 0) {
		passiveEffectBuilder.effect(
			effect('phase_skip', 'add')
				.params({
					source: passiveId,
					...(skipPhases.length > 0 ? { phases: skipPhases } : {}),
					...(skipSteps.length > 0 ? { steps: skipSteps } : {}),
				})
				.build(),
		);
	}

	for (const nested of nestedEffects) {
		passiveEffectBuilder.effect(nested);
	}

	return passiveEffectBuilder.build();
}

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
			.enter(
				buildTierPassiveEffect({
					tierId: 'happiness:tier:despair',
					passiveId: 'passive:happiness:despair',
					summary: '💰 Income -50%. ⏭️ Skip Growth. 🛡️ War Recovery skipped.',
					removalCondition: 'happiness rises to -9 or higher',
					removalText: formatRemoval('happiness rises to -9 or higher'),
					nestedEffects: [incomeModifier('happiness:despair:income', -0.5)],
					skip: {
						phases: [GROWTH_PHASE_ID],
						steps: [
							{
								phaseId: UPKEEP_PHASE_ID,
								stepId: WAR_RECOVERY_STEP_ID,
							},
						],
					},
				}),
			)
			.text((text) => {
				const removalDetail = 'happiness rises to -9 or higher';
				text
					.summary('💰 Income -50%. ⏭️ Skip Growth. 🛡️ War Recovery skipped.')
					.removal(formatRemoval(removalDetail));
				return text;
			})
			.display((display) =>
				display.removalCondition('happiness rises to -9 or higher'),
			)
			.build(),
		happinessTier('happiness:tier:misery')
			.range(-9, -8)
			.incomeMultiplier(0.5)
			.disableGrowth()
			.enter(
				buildTierPassiveEffect({
					tierId: 'happiness:tier:misery',
					passiveId: 'passive:happiness:misery',
					summary: '💰 Income -50%. ⏭️ Skip Growth while morale is desperate.',
					removalCondition: 'happiness leaves the -9 to -8 range',
					removalText: formatRemoval('happiness leaves the -9 to -8 range'),
					nestedEffects: [incomeModifier('happiness:misery:income', -0.5)],
					skip: {
						phases: [GROWTH_PHASE_ID],
					},
				}),
			)
			.text((text) => {
				const removalDetail = 'happiness leaves the -9 to -8 range';
				text
					.summary('💰 Income -50%. ⏭️ Skip Growth while morale is desperate.')
					.removal(formatRemoval(removalDetail));
				return text;
			})
			.display((display) =>
				display.removalCondition('happiness leaves the -9 to -8 range'),
			)
			.build(),
		happinessTier('happiness:tier:grim')
			.range(-7, -5)
			.incomeMultiplier(0.75)
			.disableGrowth()
			.enter(
				buildTierPassiveEffect({
					tierId: 'happiness:tier:grim',
					passiveId: 'passive:happiness:grim',
					summary: '💰 Income -25%. ⏭️ Skip Growth until spirits recover.',
					removalCondition: 'happiness leaves the -7 to -5 range',
					removalText: formatRemoval('happiness leaves the -7 to -5 range'),
					nestedEffects: [incomeModifier('happiness:grim:income', -0.25)],
					skip: {
						phases: [GROWTH_PHASE_ID],
					},
				}),
			)
			.text((text) => {
				const removalDetail = 'happiness leaves the -7 to -5 range';
				text
					.summary('💰 Income -25%. ⏭️ Skip Growth until spirits recover.')
					.removal(formatRemoval(removalDetail));
				return text;
			})
			.display((display) =>
				display.removalCondition('happiness leaves the -7 to -5 range'),
			)
			.build(),
		happinessTier('happiness:tier:unrest')
			.range(-4, -3)
			.incomeMultiplier(0.75)
			.enter(
				buildTierPassiveEffect({
					tierId: 'happiness:tier:unrest',
					passiveId: 'passive:happiness:unrest',
					summary: '💰 Income -25% while unrest simmers.',
					removalCondition: 'happiness leaves the -4 to -3 range',
					removalText: formatRemoval('happiness leaves the -4 to -3 range'),
					nestedEffects: [incomeModifier('happiness:unrest:income', -0.25)],
				}),
			)
			.text((text) => {
				const removalDetail = 'happiness leaves the -4 to -3 range';
				text
					.summary('💰 Income -25% while unrest simmers.')
					.removal(formatRemoval(removalDetail));
				return text;
			})
			.display((display) =>
				display.removalCondition('happiness leaves the -4 to -3 range'),
			)
			.build(),
		happinessTier('happiness:tier:steady')
			.range(-2, 2)
			.incomeMultiplier(1)
			.enter(
				buildTierPassiveEffect({
					tierId: 'happiness:tier:steady',
					passiveId: 'passive:happiness:steady',
					summary: 'Morale is steady. No tier bonuses are active.',
					removalCondition: 'happiness leaves the -2 to +2 range',
					removalText: formatRemoval('happiness leaves the -2 to +2 range'),
				}),
			)
			.text((text) => {
				const removalDetail = 'happiness leaves the -2 to +2 range';
				text
					.summary('Morale is steady. No tier bonuses are active.')
					.removal(formatRemoval(removalDetail));
				return text;
			})
			.display((display) =>
				display.removalCondition('happiness leaves the -2 to +2 range'),
			)
			.build(),
		happinessTier('happiness:tier:content')
			.range(3, 4)
			.incomeMultiplier(1.2)
			.enter(
				buildTierPassiveEffect({
					tierId: 'happiness:tier:content',
					passiveId: 'passive:happiness:content',
					summary: '💰 Income +20% while the realm is content.',
					removalCondition: 'happiness leaves the +3 to +4 range',
					removalText: formatRemoval('happiness leaves the +3 to +4 range'),
					nestedEffects: [incomeModifier('happiness:content:income', 0.2)],
				}),
			)
			.text((text) => {
				const removalDetail = 'happiness leaves the +3 to +4 range';
				text
					.summary('💰 Income +20% while the realm is content.')
					.removal(formatRemoval(removalDetail));
				return text;
			})
			.display((display) =>
				display.removalCondition('happiness leaves the +3 to +4 range'),
			)
			.build(),
		happinessTier('happiness:tier:joyful')
			.range(5, 7)
			.incomeMultiplier(1.25)
			.buildingDiscountPct(0.2)
			.enter(
				buildTierPassiveEffect({
					tierId: 'happiness:tier:joyful',
					passiveId: 'passive:happiness:joyful',
					summary: '💰 Income +25%. 🏛️ Building costs reduced by 20%.',
					removalCondition: 'happiness leaves the +5 to +7 range',
					removalText: formatRemoval('happiness leaves the +5 to +7 range'),
					nestedEffects: [
						incomeModifier('happiness:joyful:income', 0.25),
						buildingDiscountModifier('happiness:joyful:build-discount'),
					],
				}),
			)
			.text((text) => {
				const removalDetail = 'happiness leaves the +5 to +7 range';
				text
					.summary('💰 Income +25%. 🏛️ Building costs reduced by 20%.')
					.removal(formatRemoval(removalDetail));
				return text;
			})
			.display((display) =>
				display.removalCondition('happiness leaves the +5 to +7 range'),
			)
			.build(),
		happinessTier('happiness:tier:elated')
			.range(8, 9)
			.incomeMultiplier(1.5)
			.buildingDiscountPct(0.2)
			.enter(
				buildTierPassiveEffect({
					tierId: 'happiness:tier:elated',
					passiveId: 'passive:happiness:elated',
					summary: '💰 Income +50%. 🏛️ Building costs reduced by 20%.',
					removalCondition: 'happiness leaves the +8 to +9 range',
					removalText: formatRemoval('happiness leaves the +8 to +9 range'),
					nestedEffects: [
						incomeModifier('happiness:elated:income', 0.5),
						buildingDiscountModifier('happiness:elated:build-discount'),
					],
				}),
			)
			.text((text) => {
				const removalDetail = 'happiness leaves the +8 to +9 range';
				text
					.summary('💰 Income +50%. 🏛️ Building costs reduced by 20%.')
					.removal(formatRemoval(removalDetail));
				return text;
			})
			.display((display) =>
				display.removalCondition('happiness leaves the +8 to +9 range'),
			)
			.build(),
		happinessTier('happiness:tier:ecstatic')
			.range(10)
			.incomeMultiplier(1.5)
			.buildingDiscountPct(0.2)
			.growthBonusPct(0.2)
			.enter(
				buildTierPassiveEffect({
					tierId: 'happiness:tier:ecstatic',
					passiveId: 'passive:happiness:ecstatic',
					summary:
						'💰 Income +50%. 🏛️ Building costs reduced by 20%. 📈 Growth +20%.',
					removalCondition: 'happiness drops below +10',
					removalText: formatRemoval('happiness drops below +10'),
					nestedEffects: [
						incomeModifier('happiness:ecstatic:income', 0.5),
						buildingDiscountModifier('happiness:ecstatic:build-discount'),
						growthBonusEffect(0.2),
					],
				}),
			)
			.text((text) => {
				const removalDetail = 'happiness drops below +10';
				text
					.summary(
						'💰 Income +50%. 🏛️ Building costs reduced by 20%. 📈 Growth +20%.',
					)
					.removal(formatRemoval(removalDetail));
				return text;
			})
			.display((display) =>
				display.removalCondition('happiness drops below +10'),
			)
			.build(),
	],
	slotsPerNewLand: 1,
	maxSlotsPerLand: 2,
	basePopulationCap: 1,
};
/* eslint-enable max-lines */
