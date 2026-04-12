/**
 * Byte-Sized Empire — Resource Definitions
 *
 * All game resources for the score-based engine-builder game mode.
 * Uses the same builder patterns as the core kingdom-builder resources.
 */
import { resource, resourceCategory, resourceGroup, boundTo } from '../infrastructure/resource';
import type { ResourceDefinition, ResourceCategoryDefinition, ResourceGroupDefinition } from '../infrastructure/resource';
import { Res } from './ids';

// ═══════════════════════════════════════════════════════════════════
// RESOURCES
// ═══════════════════════════════════════════════════════════════════

const goldResource = resource(Res.gold)
	.icon('\u{1FA99}')
	.label('Gold')
	.description('Gold is the primary currency. Earn it through buildings ' + 'and trade, spend it on construction and recruitment.')
	.lowerBound(0)
	.section('economy')
	.trackValueBreakdown()
	.build();

const foodResource = resource(Res.food)
	.icon('\u{1F33E}')
	.label('Food')
	.description('Food sustains your population. A shortage leads to ' + 'starvation and unrest.')
	.lowerBound(0)
	.section('economy')
	.trackValueBreakdown()
	.build();

const materialsResource = resource(Res.materials)
	.icon('\u26CF\uFE0F')
	.label('Materials')
	.description('Materials are raw supplies used for construction. ' + 'Mines and workshops provide a steady flow.')
	.lowerBound(0)
	.section('economy')
	.trackValueBreakdown()
	.build();

const knowledgeResource = resource(Res.knowledge)
	.icon('\u{1F4DA}')
	.label('Knowledge')
	.description('Knowledge fuels research. Accumulate it to unlock ' + 'advanced buildings and technologies.')
	.lowerBound(0)
	.section('economy')
	.build();

const influenceResource = resource(Res.influence)
	.icon('\u{1F451}')
	.label('Influence')
	.description('Influence represents your political reach. Use it for ' + 'interference actions and to gain victory points.')
	.lowerBound(0)
	.section('economy')
	.build();

const populationCapResource = resource(Res.populationCap)
	.icon('\u{1F465}')
	.label('Pop Cap')
	.description('The maximum number of citizens your kingdom can ' + 'sustain. Build housing to raise the cap.')
	.lowerBound(0)
	.section('economy')
	.build();

const defenseResource = resource(Res.defense)
	.icon('\u{1F6E1}\uFE0F')
	.label('Defense')
	.description('Defense reduces the effectiveness of enemy raids ' + 'against your kingdom.')
	.lowerBound(0)
	.section('combat')
	.build();

const castleHPResource = resource(Res.castleHP)
	.icon('\u{1F3F0}')
	.label('Castle HP')
	.description('The structural integrity of your castle. If it ' + 'reaches zero, your kingdom falls.')
	.tags('attack-target', 'win-condition-zero')
	.lowerBound(0)
	.upperBound(100)
	.section('combat')
	.build();

const happinessResource = resource(Res.happiness)
	.icon('\u{1F610}')
	.label('Happiness')
	.description('Happiness reflects the mood of your subjects. ' + 'High happiness grants bonuses, low happiness ' + 'causes penalties.')
	.section('economy')
	.build();

const vpResource = resource(Res.vp)
	.icon('\u2B50')
	.label('VP')
	.description('Victory Points determine the winner when the turn ' + 'limit is reached. Earn them through buildings, ' + 'influence, and prosperity.')
	.lowerBound(0)
	.section('economy')
	.build();

const apResource = resource(Res.ap)
	.icon('\u26A1')
	.label('AP')
	.description('Action Points limit how many commands you can issue ' + 'each turn. Spend them wisely.')
	.lowerBound(0)
	.section('economy')
	.build();

const t1DoneResource = resource(Res.t1Done)
	.icon('\u{1F4D6}')
	.label('T1 Research Done')
	.description('Tracks completed tier-1 research. Accumulate enough ' + 'to unlock tier-2 technologies.')
	.lowerBound(0)
	.section('economy')
	.build();

const t2DoneResource = resource(Res.t2Done)
	.icon('\u{1F4D6}')
	.label('T2 Research Done')
	.description('Tracks completed tier-2 research. Accumulate enough ' + 'to unlock tier-3 technologies.')
	.lowerBound(0)
	.section('economy')
	.build();

// ═══════════════════════════════════════════════════════════════════
// POPULATION GROUP
// ═══════════════════════════════════════════════════════════════════

const POPULATION_GROUP_ID = 'bse-population';

const populationResource = resource(Res.population)
	.icon('\u{1F464}')
	.label('Population')
	.description('The number of citizens in your kingdom. Population ' + 'is capped by your Pop Cap.')
	.group(POPULATION_GROUP_ID, { order: 1 })
	.order(1)
	.lowerBound(0)
	.upperBound(boundTo(Res.populationCap))
	.section('economy')
	.build();

// ═══════════════════════════════════════════════════════════════════
// RESOURCE GROUPS
// ═══════════════════════════════════════════════════════════════════

const populationGroup = resourceGroup(POPULATION_GROUP_ID)
	.label('Population')
	.icon('\u{1F465}')
	.order(1)
	.parent({
		id: Res.population,
		label: 'Population',
		icon: '\u{1F464}',
		description: 'Current population count. Cannot exceed Pop Cap.',
		lowerBound: 0,
		upperBound: boundTo(Res.populationCap),
	})
	.build();

// ═══════════════════════════════════════════════════════════════════
// RESOURCE CATEGORIES
// ═══════════════════════════════════════════════════════════════════

const primaryCategory = resourceCategory('resource-category:bse:primary')
	.label('Primary Resources')
	.icon('\u{1F48E}')
	.description('Core resources that drive your economy and scoring.')
	.order(1)
	.primary()
	.resource(Res.gold)
	.resource(Res.food)
	.resource(Res.materials)
	.resource(Res.knowledge)
	.resource(Res.influence)
	.resource(Res.vp)
	.resource(Res.ap)
	.group(POPULATION_GROUP_ID)
	.build();

const secondaryCategory = resourceCategory('resource-category:bse:secondary')
	.label('Secondary Resources')
	.icon('\u{1F4CA}')
	.description('Combat stats, mood, and game progression trackers.')
	.order(2)
	.resource(Res.defense)
	.resource(Res.happiness)
	.resource(Res.castleHP)
	.build();

// ═══════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════

export function getResourceDefinitions(): readonly ResourceDefinition[] {
	return [
		goldResource,
		foodResource,
		materialsResource,
		knowledgeResource,
		influenceResource,
		populationCapResource,
		populationResource,
		defenseResource,
		castleHPResource,
		happinessResource,
		vpResource,
		apResource,
		t1DoneResource,
		t2DoneResource,
	];
}

export function getResourceGroupDefinitions(): readonly ResourceGroupDefinition[] {
	return [populationGroup];
}

export function getResourceCategoryDefinitions(): readonly ResourceCategoryDefinition[] {
	return [primaryCategory, secondaryCategory];
}
