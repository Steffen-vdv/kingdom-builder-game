import type { HappinessTierDefinition, RuleSet } from '@kingdom-builder/protocol';
import { PhaseId } from './phases';
import { createTierPassiveEffect } from './happinessHelpers';
import { happinessTier, passiveParams, winCondition } from './config/builders';
import { formatPassiveRemoval } from './text';
import { HAPPINESS_TIER_ICONS, TIER_CONFIGS, type TierConfig } from './rules.config';
import { HAPPINESS_RESOURCE_DEFINITION } from './resourceV2/definitions';
import type { ResourceV2TierDefinition, ResourceV2TierTrackMetadata } from './resourceV2';

type HappinessTierSlug = keyof typeof HAPPINESS_TIER_ICONS;

function formatTierName(slug: HappinessTierSlug) {
	return slug
		.split(/[-_]/g)
		.filter(Boolean)
		.map((part) => part.charAt(0).toUpperCase() + part.slice(1))
		.join(' ');
}

const happinessSummaryToken = (slug: string) => `happiness.tier.summary.${slug}`;

const happinessTierTrack = HAPPINESS_RESOURCE_DEFINITION.tierTrack;

if (!happinessTierTrack) {
	throw new Error('Happiness resource is missing tier track metadata.');
}

const HAPPINESS_RESOURCE_ID = HAPPINESS_RESOURCE_DEFINITION.id;
const HAPPINESS_TIER_TRACK_METADATA: ResourceV2TierTrackMetadata = happinessTierTrack.metadata;

const HAPPINESS_RESOURCE_TIERS = new Map<string, ResourceV2TierDefinition>();
for (const tier of happinessTierTrack.tiers) {
	HAPPINESS_RESOURCE_TIERS.set(tier.id, tier);
}

function resolveResourceTier(config: TierConfig): ResourceV2TierDefinition {
	const tier = HAPPINESS_RESOURCE_TIERS.get(config.id);
	if (!tier) {
		throw new Error(`Missing ResourceV2 tier definition for "${config.id}".`);
	}
	return tier;
}

function buildTierDefinition(config: TierConfig): HappinessTierDefinition {
	const tierDefinition = resolveResourceTier(config);
	const icon = tierDefinition.icon ?? HAPPINESS_TIER_ICONS[config.slug];
	const name = tierDefinition.label ?? formatTierName(config.slug);
	const summaryToken = happinessSummaryToken(config.slug);
	const builder = happinessTier(config.id)
		.range(config.range.min, config.range.max)
		.incomeMultiplier(config.incomeMultiplier)
		.text((text) => text.summary(config.summary).removal(formatPassiveRemoval(config.removal)))
		.display((display) => display.summaryToken(summaryToken).removalCondition(config.removal).title(name).icon(icon));
	if (config.passiveId) {
		const params = passiveParams().id(config.passiveId);
		config.skipPhases?.forEach((phaseId) => params.skipPhase(phaseId));
		config.skipSteps?.forEach(({ phase, step }) => {
			params.skipStep(phase, step);
		});
		const passive = createTierPassiveEffect({
			tierId: config.id,
			resourceId: HAPPINESS_RESOURCE_ID,
			tierTrackMetadata: HAPPINESS_TIER_TRACK_METADATA,
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

const tierDefinitions: HappinessTierDefinition[] = TIER_CONFIGS.map((config) => buildTierDefinition(config));

const WIN_CONDITIONS = [
	winCondition('castle-destroyed')
		.resourceAtMost('castleHP', 0)
		.subjectDefeat()
		.opponentVictory()
		.display((display) => display.icon('castleHP').victory('The enemy stronghold collapses—your banners fly victorious!').defeat('Your castle lies in ruins. The siege is lost.'))
		.build(),
];

export const RULES = {
	defaultActionAPCost: 1,
	absorptionCapPct: 1,
	absorptionRounding: 'down',
	tieredResourceKey: 'happiness',
	tierDefinitions,
	slotsPerNewLand: 1,
	maxSlotsPerLand: 2,
	basePopulationCap: 1,
	winConditions: WIN_CONDITIONS,
	corePhaseIds: {
		growth: PhaseId.Growth,
		upkeep: PhaseId.Upkeep,
	},
	tieredResourceId: HAPPINESS_RESOURCE_ID,
	tierTrackMetadata: HAPPINESS_TIER_TRACK_METADATA,
} satisfies RuleSet & {
	tieredResourceId: string;
	tierTrackMetadata: ResourceV2TierTrackMetadata;
};
