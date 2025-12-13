import {
	resource,
	createResourceRegistry,
	RESOURCE_REGISTRY,
	RESOURCE_GROUP_REGISTRY,
} from '@kingdom-builder/contents';

export const resourceKeys = {
	ap: 'synthetic:resource:ap',
	gold: 'synthetic:resource:gold',
} as const;

export const statKeys = {
	army: 'synthetic:stat:army-strength',
	fort: 'synthetic:stat:fort-strength',
	growth: 'synthetic:stat:growth',
	war: 'synthetic:stat:war-weariness',
} as const;

export const populationKeys = {
	council: 'synthetic:population:council',
	legion: 'synthetic:population:legion',
	fortifier: 'synthetic:population:fortifier',
} as const;

const syntheticResourceDefs = [
	resource(resourceKeys.ap)
		.label('Action Points')
		.icon('⚡')
		.lowerBound(0)
		.build(),
	resource(resourceKeys.gold).label('Gold').icon('💰').lowerBound(0).build(),
	resource(statKeys.army)
		.label('Army Strength')
		.icon('⚔️')
		.lowerBound(0)
		.build(),
	resource(statKeys.fort)
		.label('Fort Strength')
		.icon('🏰')
		.lowerBound(0)
		.build(),
	resource(statKeys.growth)
		.label('Growth')
		.icon('📈')
		.lowerBound(0)
		.allowDecimal()
		.build(),
	resource(statKeys.war)
		.label('War Weariness')
		.icon('😟')
		.lowerBound(0)
		.build(),
	resource(populationKeys.council)
		.label('Council')
		.icon('👔')
		.lowerBound(0)
		.build(),
	resource(populationKeys.legion)
		.label('Legion')
		.icon('🛡️')
		.lowerBound(0)
		.build(),
	resource(populationKeys.fortifier)
		.label('Fortifier')
		.icon('🏗️')
		.lowerBound(0)
		.build(),
];

const allResourceDefs = [
	...RESOURCE_REGISTRY.ordered,
	...syntheticResourceDefs,
];

export const testResourceRegistry = createResourceRegistry(allResourceDefs);
export const testResourceGroupRegistry = RESOURCE_GROUP_REGISTRY;
