import type { ResourceV2Definition } from '@kingdom-builder/protocol';
import type { ResourceV2DefinitionBuilder } from '../config/builders/resourceV2';
import { resourceV2Definition, resourceV2TierTrack } from '../config/builders/resourceV2';

export const ResourceV2Id = {
	Absorption: 'absorption',
} as const;

const definitionBuilders: ReadonlyArray<ResourceV2DefinitionBuilder> = [
	resourceV2Definition(ResourceV2Id.Absorption)
		.name('Absorption')
		.icon('🌀')
		.description(['Absorption reduces incoming damage by a percentage.', 'It represents magical barriers or tactical advantages that', 'soften blows.'].join(' '))
		.order(1)
		.displayAsPercent()
		.tierTrack(resourceV2TierTrack('absorption-tier').tierWith('absorption-baseline', (tier) => tier.range(0).summary('Maintain absorption bonuses as they are applied.'))),
];

export const RESOURCE_V2_DEFINITIONS: ReadonlyArray<ResourceV2Definition> = definitionBuilders.map((builder) => builder.build());
