import type { ResourceV2Definition } from '@kingdom-builder/protocol';
import { resourceV2Definition, resourceV2TierTrack, type ResourceV2DefinitionBuilder } from '../config/builders/resourceV2';

const definitionBuilders: ReadonlyArray<ResourceV2DefinitionBuilder> = [
	resourceV2Definition('absorption')
		.name('Absorption')
		.icon('🌀')
		.description('Absorption reduces incoming damage by a percentage. It represents magical barriers or tactical advantages that soften blows.')
		.order(200)
		.displayAsPercent()
		.lowerBound(0)
		.upperBound(1)
		.tierTrack(
			resourceV2TierTrack('absorption-tier-track').tierWith('absorption-baseline', (tier) =>
				tier.range(0).title('Baseline Ward').summary('Placeholder tier to keep absorption hook plumbing active while balancing work proceeds.'),
			),
		),
];

export const RESOURCE_V2_DEFINITIONS: ReadonlyArray<ResourceV2Definition> = definitionBuilders.map((builder) => builder.build());
