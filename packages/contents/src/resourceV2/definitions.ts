import type { ResourceV2Definition } from '@kingdom-builder/protocol';
import { resourceV2Definition, resourceV2TierTrack, type ResourceV2DefinitionBuilder } from '../config/builders/resourceV2';

export const ResourceV2Id = {
	Absorption: 'absorption',
} as const;

const absorptionTierTrack = resourceV2TierTrack('absorption:tiers')
	.tierWith('baseline', (tier) => tier.range(0, 1).summary('Maintain wards that blunt incoming attacks.').description('Future updates will expand Absorption tiers and hooks.'))
	.build();

const definitionBuilders: ReadonlyArray<ResourceV2DefinitionBuilder> = [
	resourceV2Definition(ResourceV2Id.Absorption)
		.name('Absorption')
		.icon('🌀')
		.description('Absorption reduces incoming damage by the listed percent. Strengthen your wards to push toward the cap.')
		.order(40)
		.displayAsPercent()
		.lowerBound(0)
		.upperBound(1)
		.tierTrack(absorptionTierTrack),
];

export const RESOURCE_V2_DEFINITIONS: ReadonlyArray<ResourceV2Definition> = definitionBuilders.map((builder) => builder.build());
