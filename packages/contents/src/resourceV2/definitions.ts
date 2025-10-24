import type { ResourceV2Definition } from '@kingdom-builder/protocol';
import { resourceV2Definition, resourceV2TierTrack, type ResourceV2DefinitionBuilder } from '../config/builders/resourceV2';

export const ResourceV2Id = {
	Absorption: 'absorption',
} as const;

export type ResourceV2IdKey = (typeof ResourceV2Id)[keyof typeof ResourceV2Id];

const absorptionTierTrack = resourceV2TierTrack('absorption-barrier')
	.tierWith('latent-barrier', (tier) => tier.range(0, 1).title('Latent Barrier').summary('Absorption is building up but not yet perfect.'))
	.tierWith('perfect-barrier', (tier) => tier.range(1).title('Perfect Barrier').summary('Absorption has reached its maximum potency.'));

const definitionBuilders: ReadonlyArray<ResourceV2DefinitionBuilder> = [
	resourceV2Definition(ResourceV2Id.Absorption)
		.name('Absorption')
		.icon('🌀')
		.description('Absorption reduces incoming damage by a percentage. It represents magical barriers or tactical advantages that soften blows.')
		.order(1)
		.displayAsPercent()
		.lowerBound(0)
		.upperBound(1)
		.tierTrack(absorptionTierTrack),
];

export const RESOURCE_V2_DEFINITIONS: ReadonlyArray<ResourceV2Definition> = definitionBuilders.map((builder) => builder.build());
