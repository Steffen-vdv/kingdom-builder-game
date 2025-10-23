import { PassiveMethods, Types } from '../../config/builderShared';
import { passiveParams } from '../../config/builders';
import { createTierPassiveEffect } from '../../happinessHelpers';
import { HAPPINESS_TIER_ICONS, TIER_CONFIGS } from '../../rules.config';
import { resourceV2 } from '../resourceBuilder';
import type { ResourceV2TierDefinition } from '../types';

type HappinessTierSlug = keyof typeof HAPPINESS_TIER_ICONS;

const HAPPINESS_RESOURCE_ID = 'resource:core:happiness' as const;
const HAPPINESS_TIER_TRACK_ID = `${HAPPINESS_RESOURCE_ID}:tier-track` as const;
const HAPPINESS_TIER_TRACK_METADATA = {
	id: HAPPINESS_TIER_TRACK_ID,
	label: 'Happiness Outlook',
	icon: '😊',
} as const;

const happinessSummaryToken = (slug: string) => `happiness.tier.summary.${slug}`;

function formatTierName(slug: HappinessTierSlug) {
	return slug
		.split(/[-_]/g)
		.filter(Boolean)
		.map((part) => part.charAt(0).toUpperCase() + part.slice(1))
		.join(' ');
}

const HAPPINESS_TIERS: readonly ResourceV2TierDefinition[] = TIER_CONFIGS.map((config, index) => {
	const icon = HAPPINESS_TIER_ICONS[config.slug];
	const label = formatTierName(config.slug);
	const summaryToken = happinessSummaryToken(config.slug);
	const tier: ResourceV2TierDefinition = {
		id: config.id,
		label,
		icon,
		description: config.summary,
		order: index + 1,
		threshold: {
			...(config.range.min !== undefined ? { min: config.range.min } : {}),
			...(config.range.max !== undefined ? { max: config.range.max } : {}),
		},
	};
	if (config.passiveId) {
		const params = passiveParams().id(config.passiveId);
		config.skipPhases?.forEach((phaseId) => params.skipPhase(phaseId));
		config.skipSteps?.forEach(({ phase, step }) => params.skipStep(phase, step));
		const passiveEffect = createTierPassiveEffect({
			tierId: config.id,
			resourceId: HAPPINESS_RESOURCE_ID,
			tierTrackMetadata: HAPPINESS_TIER_TRACK_METADATA,
			summary: config.summary,
			summaryToken,
			removalDetail: config.removal,
			params,
			...(config.effects ? { effects: config.effects } : {}),
			icon,
			name: label,
		}).build();
		tier.enterEffects = [passiveEffect];
		tier.exitEffects = [
			{
				type: Types.Passive,
				method: PassiveMethods.REMOVE,
				params: { id: config.passiveId },
			},
		];
	}
	return tier;
});

export const HAPPINESS_RESOURCE_DEFINITION = resourceV2(HAPPINESS_RESOURCE_ID)
	.icon('😊')
	.label('Happiness')
	.description('Happiness measures the contentment of your subjects. High happiness keeps morale up, while low happiness can lead to unrest or negative effects.')
	.tierTrack({
		metadata: HAPPINESS_TIER_TRACK_METADATA,
		tiers: HAPPINESS_TIERS,
	})
	.build();
