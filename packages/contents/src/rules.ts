import type {
	RuleSet,
	HappinessTierDefinition,
} from '@kingdom-builder/protocol';
import {
	buildingDiscountModifier,
	createTierPassiveEffect,
	growthBonusEffect,
	incomeModifier,
} from './happinessHelpers';
import { happinessTier, passiveParams } from './config/builders';
import { Resource } from './resources';
import { formatPassiveRemoval } from './text';
import { PhaseId, PhaseStepId } from './phases';
import type { TierConfig } from './rules.types';

const HAPPINESS_TIER_ICONS = {
	despair: '😡',
	misery: '😠',
	grim: '😟',
	unrest: '🙁',
	steady: '😐',
	content: '🙂',
	joyful: '😊',
	elated: '😄',
	ecstatic: '🤩',
} as const;

type HappinessTierSlug = keyof typeof HAPPINESS_TIER_ICONS;

function formatTierName(slug: HappinessTierSlug) {
	return slug
		.split(/[-_]/g)
		.filter(Boolean)
		.map((part) => part.charAt(0).toUpperCase() + part.slice(1))
		.join(' ');
}

const happinessSummaryToken = (slug: string) =>
	`happiness.tier.summary.${slug}`;

const joinSummary = (...lines: string[]) => lines.join('\n');

const TIER_CONFIGS: TierConfig[] = [
	{
		id: 'happiness:tier:despair',
		passiveId: 'passive:happiness:despair',
		slug: 'despair',
		range: { min: -10 },
		incomeMultiplier: 0.5,
		disableGrowth: true,
		skipPhases: [PhaseId.Growth],
		skipSteps: [
			{
				phase: PhaseId.Upkeep,
				step: PhaseStepId.WarRecovery,
			},
		],
		summary: joinSummary(
			'During income step, gain 50% less 🪙 gold (rounded up).',
			'Skip Growth phase.',
			'Skip War Recovery step during Upkeep phase.',
		),
		removal: 'happiness is -10 or lower',
		effects: [incomeModifier('happiness:despair:income', -0.5)],
	},
	{
		id: 'happiness:tier:misery',
		passiveId: 'passive:happiness:misery',
		slug: 'misery',
		range: { min: -9, max: -8 },
		incomeMultiplier: 0.5,
		disableGrowth: true,
		skipPhases: [PhaseId.Growth],
		summary: joinSummary(
			'During income step, gain 50% less 🪙 gold (rounded up).',
			'Skip Growth phase.',
		),
		removal: 'happiness stays between -9 and -8',
		effects: [incomeModifier('happiness:misery:income', -0.5)],
	},
	{
		id: 'happiness:tier:grim',
		passiveId: 'passive:happiness:grim',
		slug: 'grim',
		range: { min: -7, max: -5 },
		incomeMultiplier: 0.75,
		disableGrowth: true,
		skipPhases: [PhaseId.Growth],
		summary: joinSummary(
			'During income step, gain 25% less 🪙 gold (rounded up).',
			'Skip Growth phase.',
		),
		removal: 'happiness stays between -7 and -5',
		effects: [incomeModifier('happiness:grim:income', -0.25)],
	},
	{
		id: 'happiness:tier:unrest',
		passiveId: 'passive:happiness:unrest',
		slug: 'unrest',
		range: { min: -4, max: -3 },
		incomeMultiplier: 0.75,
		summary: 'During income step, gain 25% less 🪙 gold (rounded up).',
		removal: 'happiness stays between -4 and -3',
		effects: [incomeModifier('happiness:unrest:income', -0.25)],
	},
	{
		id: 'happiness:tier:steady',
		slug: 'steady',
		range: { min: -2, max: 2 },
		incomeMultiplier: 1,
		summary: 'No effect',
		removal: 'happiness stays between -2 and +2',
	},
	{
		id: 'happiness:tier:content',
		passiveId: 'passive:happiness:content',
		slug: 'content',
		range: { min: 3, max: 4 },
		incomeMultiplier: 1.25,
		summary: 'During income step, gain 25% more 🪙 gold (rounded up).',
		removal: 'happiness stays between +3 and +4',
		effects: [incomeModifier('happiness:content:income', 0.25)],
	},
	{
		id: 'happiness:tier:joyful',
		passiveId: 'passive:happiness:joyful',
		slug: 'joyful',
		range: { min: 5, max: 7 },
		incomeMultiplier: 1.25,
		buildingDiscountPct: 0.2,
		summary: joinSummary(
			'During income step, gain 25% more 🪙 gold (rounded up).',
			'Build action costs 20% less 🪙 gold (rounded up).',
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
		slug: 'elated',
		range: { min: 8, max: 9 },
		incomeMultiplier: 1.5,
		buildingDiscountPct: 0.2,
		summary: joinSummary(
			'During income step, gain 50% more 🪙 gold (rounded up).',
			'Build action costs 20% less 🪙 gold (rounded up).',
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
		slug: 'ecstatic',
		range: { min: 10 },
		incomeMultiplier: 1.5,
		buildingDiscountPct: 0.2,
		summary: joinSummary(
			'During income step, gain 50% more 🪙 gold (rounded up).',
			'Build action costs 20% less 🪙 gold (rounded up).',
			'Gain +20% 📈 Growth.',
		),
		removal: 'happiness is +10 or higher',
		effects: [
			incomeModifier('happiness:ecstatic:income', 0.5),
			buildingDiscountModifier('happiness:ecstatic:build-discount'),
			growthBonusEffect(0.2),
		],
	},
];

function buildTierDefinition(config: TierConfig): HappinessTierDefinition {
	const icon = HAPPINESS_TIER_ICONS[config.slug as HappinessTierSlug];
	const name = formatTierName(config.slug as HappinessTierSlug);
	const summaryToken = happinessSummaryToken(config.slug);
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
				.summaryToken(summaryToken)
				.removalCondition(config.removal)
				.title(name)
				.icon(icon),
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
			summaryToken,
			removalDetail: config.removal,
			params,
			...(config.effects ? { effects: config.effects } : {}),
			icon,
			name,
		});
		builder.passive(passive);
	}
	if (config.disableGrowth) {
		builder.disableGrowth();
	}
	if (config.buildingDiscountPct) {
		builder.buildingDiscountPct(config.buildingDiscountPct);
	}
	if ('growthBonusPct' in config && config.growthBonusPct) {
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
