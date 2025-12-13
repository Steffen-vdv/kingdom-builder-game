/**
 * Resource Definitions
 *
 * This file defines all game resources using pure builder patterns.
 * Resources are the numeric values that track player state: currencies,
 * stats, and population counts.
 *
 * For non-technical content maintainers:
 * - Each resource() call creates a new resource definition
 * - Chain methods like .icon(), .label(), .description() to set properties
 * - Use .lowerBound() and .upperBound() to set value constraints
 * - Always end with .build() to finalize the resource
 */
import { resource, resourceCategory, resourceGroup, boundTo } from './infrastructure/resource';
import type { ResourceDefinition, ResourceCategoryDefinition, ResourceGroupDefinition } from './infrastructure/resource';
import { resourceChange } from './infrastructure/resource/effects';
import { PassiveMethods, ResourceMethods, Types } from './infrastructure/builderShared';
import { effect, passiveParams, resourceAssignmentPassiveId, resourceEvaluator } from './infrastructure/builders';
import { resourceAmountChange } from './infrastructure/helpers/resourceEffects';
import { Resource } from './internal';
import { getHappinessResourceDefinition } from './infrastructure/happinessResource';

// ═══════════════════════════════════════════════════════════════════════════
// RESOURCES
// ═══════════════════════════════════════════════════════════════════════════

const goldResource = resource('resource:core:gold')
	.icon('🪙')
	.label('Gold')
	.description(
		'Gold is the foundational currency of the realm. It is earned through ' +
			'developments and actions and spent to fund buildings, recruit ' +
			'population or pay for powerful plays. A healthy treasury keeps your ' +
			'options open.',
	)
	.tags('bankruptcy-check')
	.lowerBound(0)
	.section('economy')
	.trackValueBreakdown()
	.build();

const actionPointsResource = resource('resource:core:action-points')
	.icon('⚡')
	.label('Action Points')
	.description('Action Points govern how many actions you can perform during your ' + 'turn. Plan carefully: once you run out of AP, your main phase ends.')
	.lowerBound(0)
	.globalActionCost(1)
	.section('economy')
	.trackValueBreakdown()
	.build();

const castleHpResource = resource('resource:core:castle-hp')
	.icon('🏰')
	.label('Castle HP')
	.description('Castle HP represents the durability of your stronghold. If it ever ' + 'drops to zero, your kingdom falls and the game is lost.')
	.tags('attack-target', 'win-condition-zero')
	.lowerBound(0)
	.section('combat')
	.build();

const maxPopulationResource = resource('resource:core:max-population')
	.icon('👥')
	.label('Max Population')
	.description('Max Population determines how many subjects your kingdom can sustain. ' + 'Expand infrastructure or build houses to increase it.')
	.lowerBound(0)
	.section('economy')
	.build();

const armyStrengthResource = resource('resource:core:army-strength')
	.icon('⚔️')
	.label('Army Strength')
	.description('Army Strength reflects the overall power of your military forces. ' + 'A higher value makes your attacks more formidable.')
	.lowerBound(0)
	.trackValueBreakdown()
	.section('combat')
	.build();

const fortificationStrengthResource = resource('resource:core:fortification-strength')
	.icon('🛡️')
	.label('Fortification Strength')
	.description('Fortification Strength measures the resilience of your defenses. ' + 'It reduces damage taken when enemies assault your castle.')
	.lowerBound(0)
	.trackValueBreakdown()
	.section('combat')
	.build();

const absorptionResource = resource('resource:core:absorption')
	.icon('🌀')
	.label('Absorption')
	.description('Absorption reduces incoming damage by a percentage. It represents ' + 'magical barriers or tactical advantages that soften blows.')
	.displayAsPercent()
	.allowDecimal()
	.lowerBound(0)
	.section('combat')
	.secondary()
	.build();

const growthResource = resource('resource:core:growth')
	.icon('📈')
	.label('Growth')
	.description(
		'Growth increases Army and Fortification Strength during the Raise ' +
			'Strength step. Its effect scales with active Legions and Fortifiers—' +
			'if you lack Legions or Fortifiers, that side will not gain Strength ' +
			'during the Growth phase.',
	)
	.displayAsPercent()
	.allowDecimal()
	.lowerBound(0)
	.trackValueBreakdown()
	.section('combat')
	.secondary()
	.build();

const warWearinessResource = resource('resource:core:war-weariness')
	.icon('💤')
	.label('War Weariness')
	.description('War Weariness reflects the fatigue from prolonged conflict. High ' + 'weariness can sap morale and hinder wartime efforts.')
	.lowerBound(0)
	.section('combat')
	.secondary()
	.build();

// Resources below are built lazily to avoid circular dependencies

const POPULATION_GROUP_ID = 'population';
const POPULATION_GROUP_ORDER = 3;

// Lazy initialization cache
let cachedPopulationResources: readonly ResourceDefinition[] | null = null;

function buildPopulationResources(): readonly ResourceDefinition[] {
	if (cachedPopulationResources) {
		return cachedPopulationResources;
	}

	// Effect params for population assignment passives
	const legionStrengthGainParams = resourceChange(Resource.armyStrength).amount(1).build();
	const fortifierStrengthGainParams = resourceChange(Resource.fortificationStrength).amount(1).build();

	const legionPassiveParams = passiveParams()
		.id(resourceAssignmentPassiveId(Resource.legion))
		.meta({
			source: {
				type: 'resource',
				id: Resource.legion,
				icon: '🎖️',
				name: 'Legion',
			},
		})
		.build();

	const fortifierPassiveParams = passiveParams()
		.id(resourceAssignmentPassiveId(Resource.fortifier))
		.meta({
			source: {
				type: 'resource',
				id: Resource.fortifier,
				icon: '🔧',
				name: 'Fortifier',
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

	// Council onGainAPStep effect: +1 AP per council member
	const councilApGainEffect = effect()
		.evaluator(resourceEvaluator().param('id', Resource.council).resourceId(Resource.council))
		.effect(effect(Types.Resource, ResourceMethods.ADD).params(resourceAmountChange(Resource.ap, 1)).build())
		.build();

	cachedPopulationResources = [
		resource('resource:core:council')
			.icon('⚖️')
			.label('Council')
			.description('The Council advises the crown and generates Action Points ' + 'during the Growth phase. Keeping them employed fuels your economy.')
			.group(POPULATION_GROUP_ID, { order: POPULATION_GROUP_ORDER })
			.order(1)
			.lowerBound(0)
			.upkeep(Resource.gold, 2)
			.onGainAPStep(councilApGainEffect)
			.section('economy')
			.build(),
		resource('resource:core:legion')
			.icon('🎖️')
			.label('Legion')
			.description('Legions lead your forces, boosting Army Strength and training ' + 'troops each Growth phase.')
			.group(POPULATION_GROUP_ID, { order: POPULATION_GROUP_ORDER })
			.order(2)
			.lowerBound(0)
			.upkeep(Resource.gold, 1)
			.onValueIncrease(legionOnValueIncrease)
			.onValueDecrease(legionOnValueDecrease)
			.section('economy')
			.build(),
		resource('resource:core:fortifier')
			.icon('🔧')
			.label('Fortifier')
			.description('Fortifiers reinforce your defenses. They raise Fortification ' + 'Strength and shore up the castle every Growth phase.')
			.group(POPULATION_GROUP_ID, { order: POPULATION_GROUP_ORDER })
			.order(3)
			.lowerBound(0)
			.upkeep(Resource.gold, 1)
			.onValueIncrease(fortifierOnValueIncrease)
			.onValueDecrease(fortifierOnValueDecrease)
			.section('economy')
			.build(),
	];

	return cachedPopulationResources;
}

// ═══════════════════════════════════════════════════════════════════════════
// RESOURCE GROUPS
// ═══════════════════════════════════════════════════════════════════════════

const populationGroup = resourceGroup(POPULATION_GROUP_ID)
	.label('Population')
	.icon('👥')
	.order(POPULATION_GROUP_ORDER)
	.parent({
		id: 'resource:core:total-population',
		label: 'Current Population',
		icon: '👥',
		description: 'Current Population is the sum of all assigned roles. It cannot ' + 'exceed Max Population.',
		lowerBound: 0,
		upperBound: boundTo('resource:core:max-population'),
	})
	.build();

// ═══════════════════════════════════════════════════════════════════════════
// RESOURCE CATEGORIES
// ═══════════════════════════════════════════════════════════════════════════

const primaryCategory = resourceCategory('resource-category:primary')
	.label('Primary Resources')
	.icon('💎')
	.description('Core resources that drive your turn-by-turn economy and population.')
	.order(1)
	.primary()
	.resource('resource:core:gold')
	.resource('resource:core:action-points')
	.resource('resource:core:castle-hp')
	.resource('resource:core:happiness')
	.group('population')
	.build();

const secondaryCategory = resourceCategory('resource-category:secondary')
	.label('Secondary Resources')
	.icon('📊')
	.description('Combat-related stats and passive growth modifiers.')
	.order(2)
	.resource('resource:core:army-strength')
	.resource('resource:core:fortification-strength')
	.resource('resource:core:absorption')
	.resource('resource:core:growth')
	.resource('resource:core:war-weariness')
	.build();

// ═══════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * All resource definitions in display order.
 * Some resources are built lazily due to circular dependencies.
 */
export function getResourceDefinitions(): readonly ResourceDefinition[] {
	return [
		goldResource,
		actionPointsResource,
		castleHpResource,
		getHappinessResourceDefinition(),
		maxPopulationResource,
		armyStrengthResource,
		fortificationStrengthResource,
		absorptionResource,
		growthResource,
		warWearinessResource,
		...buildPopulationResources(),
	];
}

export function getResourceGroupDefinitions(): readonly ResourceGroupDefinition[] {
	return [populationGroup];
}

export function getResourceCategoryDefinitions(): readonly ResourceCategoryDefinition[] {
	return [primaryCategory, secondaryCategory];
}
