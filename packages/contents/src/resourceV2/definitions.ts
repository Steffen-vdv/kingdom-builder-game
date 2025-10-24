import type { ResourceV2Definition } from '@kingdom-builder/protocol';
import { resourceV2Definition, resourceV2TierTrack, type ResourceV2DefinitionBuilder } from '../config/builders/resourceV2';

export const ResourceV2Id = {
	Absorption: 'absorption',
} as const;

const absorptionTierTrack = resourceV2TierTrack('absorption-baseline-track')
	.tierWith('baseline', (tier) => tier.range(0, 1).title('Baseline Ward').summary('Absorption operates at baseline strength.'))
	.build();

const definitionBuilders: ReadonlyArray<ResourceV2DefinitionBuilder> = [
	resourceV2Definition(ResourceV2Id.Absorption)
		.name('Absorption')
		.icon('🌀')
		.description('Absorption reduces incoming damage by a percentage. It represents ' + 'magical barriers or tactical advantages that soften blows.')
		.order(1)
		.displayAsPercent()
		.lowerBound(0)
		.upperBound(1)
		.tierTrack(absorptionTierTrack),
];

export const RESOURCE_V2_DEFINITIONS: ReadonlyArray<ResourceV2Definition> = definitionBuilders.map((builder) => builder.build());
