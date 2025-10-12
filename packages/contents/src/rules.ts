import type {
	RuleSet,
	HappinessTierDefinition,
} from '@kingdom-builder/protocol';
import { PhaseId } from './phases';
import { createTierPassiveEffect } from './happinessHelpers';
import { happinessTier, passiveParams, winCondition } from './config/builders';
import { Resource } from './resources';
import { formatPassiveRemoval } from './text';
import {
	HAPPINESS_TIER_ICONS,
	TIER_CONFIGS,
	type TierConfig,
} from './rules.config';

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

function buildTierDefinition(config: TierConfig): HappinessTierDefinition {
	const icon = HAPPINESS_TIER_ICONS[config.slug];
	const name = formatTierName(config.slug);
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
	return builder.build();
}

const tierDefinitions: HappinessTierDefinition[] = TIER_CONFIGS.map((config) =>
	buildTierDefinition(config),
);

const WIN_CONDITIONS = [
	winCondition('castle-destroyed')
		.resourceAtMost(Resource.castleHP, 0)
		.subjectDefeat()
		.opponentVictory()
		.display((display) =>
			display
				.icon('castleHP')
				.victory('The enemy stronghold collapses—your banners fly victorious!')
				.defeat('Your castle lies in ruins. The siege is lost.'),
		)
		.build(),
];

export const RULES: RuleSet = {
	defaultActionAPCost: 1,
	absorptionCapPct: 1,
	absorptionRounding: 'down',
	tieredResourceKey: Resource.happiness,
	tierDefinitions,
	slotsPerNewLand: 1,
	maxSlotsPerLand: 2,
	basePopulationCap: 1,
	winConditions: WIN_CONDITIONS,
	corePhaseIds: {
		growth: PhaseId.Growth,
		upkeep: PhaseId.Upkeep,
	},
};
