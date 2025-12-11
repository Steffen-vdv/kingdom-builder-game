import { PassiveMethods, ResourceMethods, Types } from '../../config/builderShared';
import { effect, passiveParams, populationAssignmentPassiveId } from '../../config/builders';
import { PopulationRole, Stat } from '../../internal';
import { resourceChange } from '..';
import { resourceGroup } from '../groupBuilder';
import { resource } from '../resourceBuilder';
import { boundTo } from '../types';
import type { ResourceDefinition, ResourceGroupDefinition } from '../types';

const POPULATION_GROUP_ID = 'population';
const POPULATION_PARENT_ID = 'resource:core:total-population';
const POPULATION_GROUP_ORDER = 3;

const COUNCIL_INFO = {
	icon: '⚖️',
	label: 'Council',
	description: 'The Council advises the crown and generates Action Points during ' + 'the Growth phase. Keeping them employed fuels your economy.',
};

const LEGION_INFO = {
	icon: '🎖️',
	label: 'Legion',
	description: 'Legions lead your forces, boosting Army Strength and training ' + 'troops each Growth phase.',
};

const FORTIFIER_INFO = {
	icon: '🔧',
	label: 'Fortifier',
	description: 'Fortifiers reinforce your defenses. They raise Fortification ' + 'Strength and shore up the castle every Growth phase.',
};

// Lazy initialization to break circular dependency with config/builders
let cachedPopulationResourceDefinitions: readonly ResourceDefinition[] | null = null;
let cachedPopulationGroupDefinitions: readonly ResourceGroupDefinition[] | null = null;

function buildPopulationResourceDefinitions(): readonly ResourceDefinition[] {
	// Effect params for population assignment passives
	const legionStrengthGainParams = resourceChange(Stat.armyStrength).amount(1).build();
	const fortifierStrengthGainParams = resourceChange(Stat.fortificationStrength).amount(1).build();

	const legionPassiveParams = passiveParams()
		.id(populationAssignmentPassiveId(PopulationRole.Legion))
		.meta({
			source: {
				type: 'resource',
				id: PopulationRole.Legion,
				icon: LEGION_INFO.icon,
				name: LEGION_INFO.label,
			},
		})
		.build();
	const fortifierPassiveParams = passiveParams()
		.id(populationAssignmentPassiveId(PopulationRole.Fortifier))
		.meta({
			source: {
				type: 'resource',
				id: PopulationRole.Fortifier,
				icon: FORTIFIER_INFO.icon,
				name: FORTIFIER_INFO.label,
			},
		})
		.build();

	// Legion: +1 Army Strength while assigned (via passive)
	const legionOnValueIncrease = effect(Types.Passive, PassiveMethods.ADD)
		.params(legionPassiveParams)
		.effect(effect(Types.Resource, ResourceMethods.ADD).params(legionStrengthGainParams).build())
		.build();
	const legionOnValueDecrease = effect(Types.Passive, PassiveMethods.REMOVE).params(legionPassiveParams).build();

	// Fortifier: +1 Fortification Strength while assigned (via passive)
	const fortifierOnValueIncrease = effect(Types.Passive, PassiveMethods.ADD)
		.params(fortifierPassiveParams)
		.effect(effect(Types.Resource, ResourceMethods.ADD).params(fortifierStrengthGainParams).build())
		.build();
	const fortifierOnValueDecrease = effect(Types.Passive, PassiveMethods.REMOVE).params(fortifierPassiveParams).build();

	return [
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
			.onValueIncrease(legionOnValueIncrease)
			.onValueDecrease(legionOnValueDecrease)
			.build(),
		resource('resource:core:fortifier')
			.icon(FORTIFIER_INFO.icon)
			.label(FORTIFIER_INFO.label)
			.description(FORTIFIER_INFO.description)
			.group(POPULATION_GROUP_ID, { order: POPULATION_GROUP_ORDER })
			.order(3)
			.lowerBound(0)
			.onValueIncrease(fortifierOnValueIncrease)
			.onValueDecrease(fortifierOnValueDecrease)
			.build(),
	];
}

export function getPopulationResourceDefinitions(): readonly ResourceDefinition[] {
	if (cachedPopulationResourceDefinitions) {
		return cachedPopulationResourceDefinitions;
	}
	cachedPopulationResourceDefinitions = buildPopulationResourceDefinitions();
	return cachedPopulationResourceDefinitions;
}

export function getPopulationGroupDefinitions(): readonly ResourceGroupDefinition[] {
	if (cachedPopulationGroupDefinitions) {
		return cachedPopulationGroupDefinitions;
	}
	cachedPopulationGroupDefinitions = [
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
	return cachedPopulationGroupDefinitions;
}
