import { Registry, type ResourceV2Definition, type ResourceV2GroupMetadata, resourceV2DefinitionSchema, resourceV2GroupMetadataSchema } from '@kingdom-builder/protocol';

import { resourceGroup, resourceGroupParent, resourceV2 } from '../config/builders';

export * from './definitions';

export const ResourceV2Id = {
	Gold: 'gold',
	ActionPoints: 'actionPoints',
	Happiness: 'happiness',
	CastleHP: 'castleHP',
	MaxPopulation: 'maxPopulation',
	ArmyStrength: 'armyStrength',
	FortificationStrength: 'fortificationStrength',
	Absorption: 'absorption',
	Growth: 'growth',
	WarWeariness: 'warWeariness',
} as const;

export type ResourceV2Id = (typeof ResourceV2Id)[keyof typeof ResourceV2Id];

export const ResourceV2GroupId = {
	KingdomCore: 'kingdomCore',
	CastleDefense: 'castleDefense',
} as const;

export type ResourceV2GroupId = (typeof ResourceV2GroupId)[keyof typeof ResourceV2GroupId];

export const ResourceV2GroupParentId = {
	KingdomCore: 'kingdomCore:total',
	CastleDefense: 'castleDefense:total',
} as const;

export type ResourceV2GroupParentId = (typeof ResourceV2GroupParentId)[keyof typeof ResourceV2GroupParentId];

type FrozenRecord<TKey extends string, TValue> = Readonly<Record<TKey, TValue>>;

function freezeRecord<TKey extends string, TValue>(entries: Array<[TKey, TValue]>): FrozenRecord<TKey, TValue> {
	const record = Object.fromEntries(entries) as Record<TKey, TValue>;
	Object.values(record).forEach((value) => Object.freeze(value));
	return Object.freeze(record);
}

function sortByOrder<T extends { order: number }>(items: T[]) {
	return [...items].sort((a, b) => a.order - b.order);
}

export function createResourceV2Registry(): FrozenRecord<ResourceV2Id, ResourceV2Definition> {
	const registry = new Registry<ResourceV2Definition>(resourceV2DefinitionSchema);

	const definitions = sortByOrder([
		resourceV2()
			.id(ResourceV2Id.Gold)
			.name('Gold')
			.icon('🪙')
			.description('Gold is the foundational currency of the realm. Earn it through ' + 'developments and actions, then invest it to fund buildings, ' + 'recruit population, or fuel bold plays.')
			.order(0)
			.lowerBound(0)
			.trackValueBreakdown()
			.groupId(ResourceV2GroupId.KingdomCore)
			.build(),
		resourceV2()
			.id(ResourceV2Id.ActionPoints)
			.name('Action Points')
			.icon('⚡')
			.description('Action Points govern how many actions you can perform during your ' + 'turn. Spend them wisely—once you run out, the main phase ' + 'ends.')
			.order(1)
			.lowerBound(0)
			.globalActionCost(1)
			.groupId(ResourceV2GroupId.KingdomCore)
			.build(),
		resourceV2()
			.id(ResourceV2Id.Happiness)
			.name('Happiness')
			.icon('😊')
			.description('Happiness measures the contentment of your subjects. Keep morale ' + 'high to avoid unrest and unlock positive events.')
			.order(2)
			.lowerBound(0)
			.groupId(ResourceV2GroupId.KingdomCore)
			.build(),
		resourceV2()
			.id(ResourceV2Id.CastleHP)
			.name('Castle HP')
			.icon('🏰')
			.description('Castle HP represents the durability of your stronghold. If it ' + 'ever drops to zero, your kingdom falls and the game ends.')
			.order(3)
			.lowerBound(0)
			.groupId(ResourceV2GroupId.CastleDefense)
			.trackValueBreakdown()
			.build(),
		resourceV2()
			.id(ResourceV2Id.MaxPopulation)
			.name('Max Population')
			.icon('👥')
			.description('Max Population determines how many subjects your kingdom can ' + 'support. Expand infrastructure to make room for more ' + 'citizens.')
			.order(4)
			.lowerBound(0)
			.trackBoundBreakdown()
			.build(),
		resourceV2()
			.id(ResourceV2Id.ArmyStrength)
			.name('Army Strength')
			.icon('⚔️')
			.description('Army Strength reflects the overall power of your military ' + 'forces. Higher values make your attacks more formidable.')
			.order(5)
			.lowerBound(0)
			.build(),
		resourceV2()
			.id(ResourceV2Id.FortificationStrength)
			.name('Fortification Strength')
			.icon('🛡️')
			.description('Fortification Strength measures the resilience of your ' + 'defenses, reducing incoming damage when enemies strike.')
			.order(6)
			.lowerBound(0)
			.groupId(ResourceV2GroupId.CastleDefense)
			.build(),
		resourceV2()
			.id(ResourceV2Id.Absorption)
			.name('Absorption')
			.icon('🌀')
			.description('Absorption reduces incoming damage by a percentage, ' + 'representing magical barriers or tactical advantages.')
			.order(7)
			.lowerBound(0)
			.upperBound(100)
			.percent()
			.build(),
		resourceV2()
			.id(ResourceV2Id.Growth)
			.name('Growth')
			.icon('📈')
			.description('Growth increases Army and Fortification Strength during the ' + 'Raise Strength step. Without active Legions or Fortifiers, ' + 'its benefits are limited.')
			.order(8)
			.percent()
			.build(),
		resourceV2()
			.id(ResourceV2Id.WarWeariness)
			.name('War Weariness')
			.icon('💤')
			.description('War Weariness reflects the fatigue from prolonged conflict and ' + 'can sap morale during extended campaigns.')
			.order(9)
			.lowerBound(0)
			.build(),
	]);

	definitions.forEach((definition) => {
		if (definition.metadata) {
			Object.freeze(definition.metadata);
		}
		if (definition.tierTrack) {
			definition.tierTrack.tiers.forEach((tier) => {
				Object.freeze(tier);
			});
			Object.freeze(definition.tierTrack.tiers);
			Object.freeze(definition.tierTrack);
		}
		registry.add(definition.id, definition);
	});

	const typedEntries = registry.entries().map(([id, definition]) => [id as ResourceV2Id, definition] as [ResourceV2Id, ResourceV2Definition]);

	return freezeRecord(typedEntries);
}

export function createResourceGroupV2Registry(): FrozenRecord<ResourceV2GroupId, ResourceV2GroupMetadata> {
	const registry = new Registry<ResourceV2GroupMetadata>(resourceV2GroupMetadataSchema);

	const kingdomCoreParent = resourceGroupParent()
		.id(ResourceV2GroupParentId.KingdomCore)
		.name('Kingdom Core Total')
		.icon('👑')
		.description("The combined value of the realm's most critical spendable " + 'resources.')
		.order(0)
		.trackValueBreakdown()
		.build();

	const castleDefenseParent = resourceGroupParent()
		.id(ResourceV2GroupParentId.CastleDefense)
		.name('Castle Defense Total')
		.icon('🛡️')
		.description('Aggregated durability of the castle and its defensive ' + 'structures.')
		.order(1)
		.trackValueBreakdown()
		.build();

	const groups = sortByOrder([
		resourceGroup()
			.id(ResourceV2GroupId.KingdomCore)
			.name('Kingdom Core')
			.icon('👑')
			.description('Spendable resources that fuel every plan.')
			.order(0)
			.parent(kingdomCoreParent)
			.children([ResourceV2Id.Gold, ResourceV2Id.ActionPoints, ResourceV2Id.Happiness])
			.build(),
		resourceGroup()
			.id(ResourceV2GroupId.CastleDefense)
			.name('Castle Defense')
			.icon('🏰')
			.description('Metrics that keep the castle standing against assaults.')
			.order(1)
			.parent(castleDefenseParent)
			.children([ResourceV2Id.CastleHP, ResourceV2Id.FortificationStrength])
			.build(),
	]);

	groups.forEach((group) => {
		if (group.metadata) {
			Object.freeze(group.metadata);
		}
		if (group.parent) {
			if (group.parent.metadata) {
				Object.freeze(group.parent.metadata);
			}
			Object.freeze(group.parent);
		}
		Object.freeze(group.children);
		registry.add(group.id, group);
	});

	const typedEntries = registry.entries().map(([id, group]) => [id as ResourceV2GroupId, group] as [ResourceV2GroupId, ResourceV2GroupMetadata]);

	return freezeRecord(typedEntries);
}

export const RESOURCE_V2 = createResourceV2Registry();

export const RESOURCE_GROUPS_V2 = createResourceGroupV2Registry();
