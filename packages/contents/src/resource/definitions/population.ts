import { resourceGroup } from '../groupBuilder';
import { resource } from '../resourceBuilder';
import { resourceChange } from '..';
import { boundTo } from '../types';
import type { ResourceDefinition, ResourceGroupDefinition } from '../types';
import {
	effect,
	passiveParams,
	populationAssignmentPassiveId,
} from '../../config/builders';
import { Types, ResourceMethods, PassiveMethods } from '../../config/builderShared';
import { PopulationRole, Stat } from '../../internal';

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

// Effect params for population assignment passives
const LEGION_STRENGTH_GAIN_PARAMS = resourceChange(Stat.armyStrength)
	.amount(1)
	.build();
const FORTIFIER_STRENGTH_GAIN_PARAMS = resourceChange(Stat.fortificationStrength)
	.amount(1)
	.build();

const LEGION_PASSIVE_PARAMS = passiveParams()
	.id(populationAssignmentPassiveId(PopulationRole.Legion))
	.build();
const FORTIFIER_PASSIVE_PARAMS = passiveParams()
	.id(populationAssignmentPassiveId(PopulationRole.Fortifier))
	.build();

// Legion: +1 Army Strength while assigned (via passive)
const LEGION_ON_VALUE_INCREASE = effect(Types.Passive, PassiveMethods.ADD)
	.params(LEGION_PASSIVE_PARAMS)
	.effect(
		effect(Types.Resource, ResourceMethods.ADD)
			.params(LEGION_STRENGTH_GAIN_PARAMS)
			.build(),
	)
	.build();
const LEGION_ON_VALUE_DECREASE = effect(Types.Passive, PassiveMethods.REMOVE)
	.params(LEGION_PASSIVE_PARAMS)
	.build();

// Fortifier: +1 Fortification Strength while assigned (via passive)
const FORTIFIER_ON_VALUE_INCREASE = effect(Types.Passive, PassiveMethods.ADD)
	.params(FORTIFIER_PASSIVE_PARAMS)
	.effect(
		effect(Types.Resource, ResourceMethods.ADD)
			.params(FORTIFIER_STRENGTH_GAIN_PARAMS)
			.build(),
	)
	.build();
const FORTIFIER_ON_VALUE_DECREASE = effect(Types.Passive, PassiveMethods.REMOVE)
	.params(FORTIFIER_PASSIVE_PARAMS)
	.build();

export const POPULATION_RESOURCE_DEFINITIONS: readonly ResourceDefinition[] = [
	resource('resource:core:council')
		.icon(COUNCIL_INFO.icon)
		.label(COUNCIL_INFO.label)
		.description(COUNCIL_INFO.description)
		.group(POPULATION_GROUP_ID, { order: POPULATION_GROUP_ORDER })
		.order(1)
		.lowerBound(0)
		.build(),
	resource('resource:core:legion')
		.icon(LEGION_INFO.icon)
		.label(LEGION_INFO.label)
		.description(LEGION_INFO.description)
		.group(POPULATION_GROUP_ID, { order: POPULATION_GROUP_ORDER })
		.order(2)
		.lowerBound(0)
		.onValueIncrease(LEGION_ON_VALUE_INCREASE)
		.onValueDecrease(LEGION_ON_VALUE_DECREASE)
		.build(),
	resource('resource:core:fortifier')
		.icon(FORTIFIER_INFO.icon)
		.label(FORTIFIER_INFO.label)
		.description(FORTIFIER_INFO.description)
		.group(POPULATION_GROUP_ID, { order: POPULATION_GROUP_ORDER })
		.order(3)
		.lowerBound(0)
		.onValueIncrease(FORTIFIER_ON_VALUE_INCREASE)
		.onValueDecrease(FORTIFIER_ON_VALUE_DECREASE)
		.build(),
];

export const POPULATION_GROUP_DEFINITIONS: readonly ResourceGroupDefinition[] = [
	resourceGroup(POPULATION_GROUP_ID)
		.label('Population')
		.icon('👥')
		.order(POPULATION_GROUP_ORDER)
		.parent({
			id: POPULATION_PARENT_ID,
			label: 'Current Population',
			icon: '👥',
			description: 'Current Population is the sum of all assigned roles. ' + 'It cannot exceed Max Population.',
			lowerBound: 0,
			upperBound: boundTo('resource:core:max-population'),
		})
		.build(),
];
