import { resourceGroup } from '../groupBuilder';
import { resourceV2 } from '../resourceBuilder';
import type { ResourceV2Definition, ResourceV2GroupDefinition } from '../types';

const POPULATION_GROUP_ID = 'population';
const POPULATION_PARENT_ID = 'resource:core:total-population';
const POPULATION_GROUP_ORDER = 3;

const COUNCIL_INFO = {
	icon: '⚖️',
	label: 'Council',
	description: 'The Council advises the crown and generates Action Points during the Growth phase. Keeping them employed fuels your economy.',
};

const LEGION_INFO = {
	icon: '🎖️',
	label: 'Legion',
	description: 'Legions lead your forces, boosting Army Strength and training troops each Growth phase.',
};

const FORTIFIER_INFO = {
	icon: '🔧',
	label: 'Fortifier',
	description: 'Fortifiers reinforce your defenses. They raise Fortification Strength and shore up the castle every Growth phase.',
};

export const POPULATION_RESOURCE_DEFINITIONS: readonly ResourceV2Definition[] = [
	resourceV2('resource:core:council')
		.icon(COUNCIL_INFO.icon)
		.label(COUNCIL_INFO.label)
		.description(COUNCIL_INFO.description)
		.group(POPULATION_GROUP_ID, { order: POPULATION_GROUP_ORDER })
		.order(1)
		.lowerBound(0)
		.build(),
	resourceV2('resource:core:legion')
		.icon(LEGION_INFO.icon)
		.label(LEGION_INFO.label)
		.description(LEGION_INFO.description)
		.group(POPULATION_GROUP_ID, { order: POPULATION_GROUP_ORDER })
		.order(2)
		.lowerBound(0)
		.build(),
	resourceV2('resource:core:fortifier')
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
		.label('Population')
		.icon('👥')
		.order(POPULATION_GROUP_ORDER)
		.parent({
			id: POPULATION_PARENT_ID,
			label: 'Current Population',
			icon: '👥',
			description: 'Current Population is the sum of all assigned roles. ' + 'It cannot exceed Max Population.',
		})
		.build(),
];
