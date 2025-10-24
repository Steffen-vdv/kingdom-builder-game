import type { ResourceV2Definition } from '@kingdom-builder/protocol';
import { resourceV2Definition, resourceV2TierTrack } from '../config/builders/resourceV2';

const absorptionTierTrack = resourceV2TierTrack('absorption-track')
	.tierWith('steady', (tier) => tier.range(0, 1).title('Steady Ward').summary('No additional warding effects.'))
	.tierWith('surging', (tier) => tier.range(1).title('Surging Ward').summary('Absorption is at maximum strength.'))
	.build();

const definitionBuilders = [
	resourceV2Definition('absorption')
		.name('Absorption')
		.icon('🌀')
		.description('Absorption reduces incoming damage by a percentage. It represents magical barriers or tactical advantages that soften blows.')
		.order(40)
		.displayAsPercent()
		.lowerBound(0)
		.upperBound(1)
		.tierTrack(absorptionTierTrack),
];

export const RESOURCE_V2_DEFINITIONS: ReadonlyArray<ResourceV2Definition> = definitionBuilders.map((builder) => builder.build());
