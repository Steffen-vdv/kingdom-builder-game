import { POPULATION_ROLES, PopulationRole } from '../../populationRoles';
import { resourceGroup } from '../groupBuilder';
import { resourceV2 } from '../resourceBuilder';
import type { ResourceV2Definition, ResourceV2GroupDefinition } from '../types';

const POPULATION_GROUP_ID = 'population';
const POPULATION_PARENT_ID = 'resource:population:total';
const POPULATION_GROUP_ORDER = 3;

const COUNCIL_INFO = POPULATION_ROLES[PopulationRole.Council];
const LEGION_INFO = POPULATION_ROLES[PopulationRole.Legion];
const FORTIFIER_INFO = POPULATION_ROLES[PopulationRole.Fortifier];

export const POPULATION_RESOURCE_DEFINITIONS: readonly ResourceV2Definition[] = [
	resourceV2('resource:population:role:council')
		.icon(COUNCIL_INFO.icon)
		.label(COUNCIL_INFO.label)
		.description(COUNCIL_INFO.description)
		.group(POPULATION_GROUP_ID, { order: POPULATION_GROUP_ORDER })
		.order(1)
		.lowerBound(0)
		.build(),
	resourceV2('resource:population:role:legion')
		.icon(LEGION_INFO.icon)
		.label(LEGION_INFO.label)
		.description(LEGION_INFO.description)
		.group(POPULATION_GROUP_ID, { order: POPULATION_GROUP_ORDER })
		.order(2)
		.lowerBound(0)
		.build(),
	resourceV2('resource:population:role:fortifier')
		.icon(FORTIFIER_INFO.icon)
		.label(FORTIFIER_INFO.label)
		.description(FORTIFIER_INFO.description)
		.group(POPULATION_GROUP_ID, { order: POPULATION_GROUP_ORDER })
		.order(3)
		.lowerBound(0)
		.build(),
];

export const POPULATION_GROUP_DEFINITIONS: readonly ResourceV2GroupDefinition[] = [
	resourceGroup(POPULATION_GROUP_ID)
		.order(POPULATION_GROUP_ORDER)
		.parent({
			id: POPULATION_PARENT_ID,
			label: 'Population',
			icon: '🧑‍🤝‍🧑',
			description: 'Population aggregates all assigned roles. This virtual track sums its child resources so you can monitor total staffing at a glance.',
		})
		.build(),
];
