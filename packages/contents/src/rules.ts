import type {
	RuleSet,
	HappinessTierDefinition,
} from '@kingdom-builder/engine/services';
import {
	buildingDiscountModifier,
	createTierPassiveEffect,
	GROWTH_PHASE_ID,
	growthBonusEffect,
	incomeModifier,
	UPKEEP_PHASE_ID,
	WAR_RECOVERY_STEP_ID,
} from './happinessHelpers';
import { happinessTier, passiveParams } from './config/builders';
import { Resource } from './resources';
import { formatPassiveRemoval } from './text';

const happinessSummaryToken = (slug: string) =>
	`happiness.tier.summary.${slug}`;

const joinSummary = (...lines: string[]) => lines.join('\n');

const TIER_CONFIGS = [
	{
		id: 'happiness:tier:despair',
		passiveId: 'passive:happiness:despair',
		range: { min: -10 },
		incomeMultiplier: 0.5,
		disableGrowth: true,
		skipPhases: [GROWTH_PHASE_ID],
		skipSteps: [{ phase: UPKEEP_PHASE_ID, step: WAR_RECOVERY_STEP_ID }],
		summaryToken: happinessSummaryToken('despair'),
		summary: joinSummary(
			'During income step, gain 50% less 🪙 gold.',
			'Skip Growth phase.',
			'Skip War Recovery step during Upkeep phase.',
		),
		removal: 'happiness is -10 or lower',
		effects: [incomeModifier('happiness:despair:income', -0.5)],
	},
	{
		id: 'happiness:tier:misery',
		passiveId: 'passive:happiness:misery',
		range: { min: -9, max: -8 },
		incomeMultiplier: 0.5,
		disableGrowth: true,
		skipPhases: [GROWTH_PHASE_ID],
		summaryToken: happinessSummaryToken('misery'),
		summary: joinSummary(
			'During income step, gain 50% less 🪙 gold.',
			'Skip Growth phase.',
		),
		removal: 'happiness stays between -9 and -8',
		effects: [incomeModifier('happiness:misery:income', -0.5)],
	},
	{
		id: 'happiness:tier:grim',
		passiveId: 'passive:happiness:grim',
		range: { min: -7, max: -5 },
		incomeMultiplier: 0.75,
		disableGrowth: true,
		skipPhases: [GROWTH_PHASE_ID],
		summaryToken: happinessSummaryToken('grim'),
		summary: joinSummary(
			'During income step, gain 25% less 🪙 gold.',
			'Skip Growth phase.',
		),
		removal: 'happiness stays between -7 and -5',
		effects: [incomeModifier('happiness:grim:income', -0.25)],
	},
	{
		id: 'happiness:tier:unrest',
		passiveId: 'passive:happiness:unrest',
		range: { min: -4, max: -3 },
		incomeMultiplier: 0.75,
		summaryToken: happinessSummaryToken('unrest'),
		summary: 'During income step, gain 25% less 🪙 gold.',
		removal: 'happiness stays between -4 and -3',
		effects: [incomeModifier('happiness:unrest:income', -0.25)],
	},
	{
		id: 'happiness:tier:steady',
		range: { min: -2, max: 2 },
		incomeMultiplier: 1,
		summaryToken: happinessSummaryToken('steady'),
		summary: 'No tier bonuses active.',
		removal: 'happiness stays between -2 and +2',
	},
	{
		id: 'happiness:tier:content',
		passiveId: 'passive:happiness:content',
		range: { min: 3, max: 4 },
		incomeMultiplier: 1.2,
		summaryToken: happinessSummaryToken('content'),
		summary: 'During income step, gain 20% more 🪙 gold.',
		removal: 'happiness stays between +3 and +4',
		effects: [incomeModifier('happiness:content:income', 0.2)],
	},
	{
		id: 'happiness:tier:joyful',
		passiveId: 'passive:happiness:joyful',
		range: { min: 5, max: 7 },
		incomeMultiplier: 1.25,
		buildingDiscountPct: 0.2,
		summaryToken: happinessSummaryToken('joyful'),
		summary: joinSummary(
			'During income step, gain 25% more 🪙 gold.',
			'Build action costs 20% less 🪙 gold.',
		),
		removal: 'happiness stays between +5 and +7',
		effects: [
			incomeModifier('happiness:joyful:income', 0.25),
			buildingDiscountModifier('happiness:joyful:build-discount'),
		],
	},
	{
		id: 'happiness:tier:elated',
		passiveId: 'passive:happiness:elated',
		range: { min: 8, max: 9 },
		incomeMultiplier: 1.5,
		buildingDiscountPct: 0.2,
		summaryToken: happinessSummaryToken('elated'),
		summary: joinSummary(
			'During income step, gain 50% more 🪙 gold.',
			'Build action costs 20% less 🪙 gold.',
		),
		removal: 'happiness stays between +8 and +9',
		effects: [
			incomeModifier('happiness:elated:income', 0.5),
			buildingDiscountModifier('happiness:elated:build-discount'),
		],
	},
	{
		id: 'happiness:tier:ecstatic',
		passiveId: 'passive:happiness:ecstatic',
		range: { min: 10 },
		incomeMultiplier: 1.5,
		buildingDiscountPct: 0.2,
		growthBonusPct: 0.2,
		summaryToken: happinessSummaryToken('ecstatic'),
		summary: joinSummary(
			'During income step, gain 50% more 🪙 gold.',
			'Build action costs 20% less 🪙 gold.',
			'During Growth phase, gain 20% more 📈 Growth.',
		),
		removal: 'happiness is +10 or higher',
		effects: [
			incomeModifier('happiness:ecstatic:income', 0.5),
			buildingDiscountModifier('happiness:ecstatic:build-discount'),
			growthBonusEffect(0.2),
		],
	},
];

type TierConfig = (typeof TIER_CONFIGS)[number];

function buildTierDefinition(config: TierConfig): HappinessTierDefinition {
	const builder = happinessTier(config.id)
		.range(config.range.min, config.range.max)
		.incomeMultiplier(config.incomeMultiplier)
		.text((text) =>
			text
				.summary(config.summary)
				.removal(formatPassiveRemoval(config.removal)),
		)
		.display((display) =>
			display
				.summaryToken(config.summaryToken)
				.removalCondition(config.removal),
		);
	if (config.passiveId) {
		const params = passiveParams().id(config.passiveId);
		config.skipPhases?.forEach((phaseId) => params.skipPhase(phaseId));
		config.skipSteps?.forEach(({ phase, step }) => {
			params.skipStep(phase, step);
		});
		const passive = createTierPassiveEffect({
			tierId: config.id,
			summary: config.summary,
			removalDetail: config.removal,
			params,
			...(config.effects ? { effects: config.effects } : {}),
		});
		builder.passive(passive);
	}
	if (config.disableGrowth) {
		builder.disableGrowth();
	}
	if (config.buildingDiscountPct) {
		builder.buildingDiscountPct(config.buildingDiscountPct);
	}
	if (config.growthBonusPct) {
		builder.growthBonusPct(config.growthBonusPct);
	}
	return builder.build();
}

const tierDefinitions: HappinessTierDefinition[] = TIER_CONFIGS.map((config) =>
	buildTierDefinition(config),
);

export const RULES: RuleSet = {
	defaultActionAPCost: 1,
	absorptionCapPct: 1,
	absorptionRounding: 'down',
	tieredResourceKey: Resource.happiness,
	tierDefinitions,
	slotsPerNewLand: 1,
	maxSlotsPerLand: 2,
	basePopulationCap: 1,
};
