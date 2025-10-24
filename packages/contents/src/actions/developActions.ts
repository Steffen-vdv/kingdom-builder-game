import type { Registry } from '@kingdom-builder/protocol';
import { Resource, getResourceV2Id, type ResourceKey } from '../resources';
import { DevelopmentId, DEVELOPMENTS } from '../developments';
import type { ActionDef } from '../actions';
import { Focus, type DevelopmentDef } from '../defs';
import { DevelopActionId } from '../actionIds';
import { ActionCategoryId as ActionCategory, ACTION_CATEGORIES } from '../actionCategories';
import { action, compareRequirement, developmentParams, effect, landEvaluator } from '../config/builders';
import { Types, DevelopmentMethods } from '../config/builderShared';
import { resourceChange, type ResourceChangeEffectParams } from '../resourceV2';

const categoryOrder = (categoryId: keyof typeof ActionCategory) => {
	const category = ACTION_CATEGORIES.get(ActionCategory[categoryId]);
	if (!category) {
		throw new Error(`Missing action category definition for id "${ActionCategory[categoryId]}".`);
	}
	return category.order ?? 0;
};

const developCategoryOrder = categoryOrder('Develop');

const developmentSlotRequirement = compareRequirement().left(landEvaluator()).operator('gt').right(0).message('Requires an available development slot.').build();

type ResourceAmount = { resource: ResourceKey; amount: number };
type DevelopmentWithIdentity = DevelopmentDef & { name: string; icon: string };

function createResourceChangeList(entries: Iterable<[ResourceKey, number]>) {
	const changes: ResourceChangeEffectParams[] = [];
	for (const [resource, amount] of entries) {
		if (!Number.isFinite(amount) || amount === 0) {
			continue;
		}
		const resourceId = getResourceV2Id(resource);
		const change = resourceChange(resourceId).amount(amount).build();
		changes.push(change);
	}
	return changes.length > 0 ? changes : undefined;
}

function createResourceChangesFromCosts(costs: readonly ResourceAmount[]) {
	return createResourceChangeList(costs.map(({ resource, amount }) => [resource, amount] as [ResourceKey, number]));
}

function createResourceChangesFromMap(map: Partial<Record<ResourceKey, number>> | undefined) {
	if (!map) {
		return undefined;
	}
	return createResourceChangeList(Object.entries(map) as [ResourceKey, number][]);
}

function requireDevelopment(id: DevelopmentId): DevelopmentWithIdentity {
	const definition = DEVELOPMENTS.get(id);
	if (!definition) {
		throw new Error(`Missing development definition for id "${id}".`);
	}
	const { name, icon } = definition;
	if (!name) {
		throw new Error(`Missing name for development definition "${id}".`);
	}
	if (!icon) {
		throw new Error(`Missing icon for development definition "${id}".`);
	}
	return { ...definition, name, icon } as DevelopmentWithIdentity;
}

const COMMON_DEVELOPMENT_COSTS: readonly ResourceAmount[] = [
	{ resource: Resource.ap, amount: 1 },
	{ resource: Resource.gold, amount: 3 },
];

function buildDevelopParams(definition: DevelopmentWithIdentity, id: DevelopmentId) {
	const baseParams = developmentParams().id(id).landId('$landId').build();
	const params: typeof baseParams & {
		construction?: ResourceChangeEffectParams[];
		upkeep?: ResourceChangeEffectParams[];
	} = { ...baseParams };
	const construction = createResourceChangesFromCosts(COMMON_DEVELOPMENT_COSTS);
	if (construction) {
		params.construction = construction;
	}
	const upkeep = createResourceChangesFromMap(definition.upkeep);
	if (upkeep) {
		params.upkeep = upkeep;
	}
	return params;
}

export function registerDevelopActions(registry: Registry<ActionDef>) {
	const house = requireDevelopment(DevelopmentId.House);
	registry.add(
		DevelopActionId.develop_house,
		action()
			.id(DevelopActionId.develop_house)
			.name(house.name)
			.icon(house.icon)
			.cost(Resource.ap, 1)
			.cost(Resource.gold, 3)
			.requirement(developmentSlotRequirement)
			.effect(effect(Types.Development, DevelopmentMethods.ADD).params(buildDevelopParams(house, DevelopmentId.House)).build())
			.category(ActionCategory.Develop)
			.order(developCategoryOrder + 0)
			.focus(house.focus ?? Focus.Economy)
			.build(),
	);

	const farm = requireDevelopment(DevelopmentId.Farm);
	registry.add(
		DevelopActionId.develop_farm,
		action()
			.id(DevelopActionId.develop_farm)
			.name(farm.name)
			.icon(farm.icon)
			.cost(Resource.ap, 1)
			.cost(Resource.gold, 3)
			.requirement(developmentSlotRequirement)
			.effect(effect(Types.Development, DevelopmentMethods.ADD).params(buildDevelopParams(farm, DevelopmentId.Farm)).build())
			.category(ActionCategory.Develop)
			.order(developCategoryOrder + 1)
			.focus(farm.focus ?? Focus.Economy)
			.build(),
	);

	const outpost = requireDevelopment(DevelopmentId.Outpost);
	registry.add(
		DevelopActionId.develop_outpost,
		action()
			.id(DevelopActionId.develop_outpost)
			.name(outpost.name)
			.icon(outpost.icon)
			.cost(Resource.ap, 1)
			.cost(Resource.gold, 3)
			.requirement(developmentSlotRequirement)
			.effect(effect(Types.Development, DevelopmentMethods.ADD).params(buildDevelopParams(outpost, DevelopmentId.Outpost)).build())
			.category(ActionCategory.Develop)
			.order(developCategoryOrder + 2)
			.focus(outpost.focus ?? Focus.Economy)
			.build(),
	);

	const watchtower = requireDevelopment(DevelopmentId.Watchtower);
	registry.add(
		DevelopActionId.develop_watchtower,
		action()
			.id(DevelopActionId.develop_watchtower)
			.name(watchtower.name)
			.icon(watchtower.icon)
			.cost(Resource.ap, 1)
			.cost(Resource.gold, 3)
			.requirement(developmentSlotRequirement)
			.effect(effect(Types.Development, DevelopmentMethods.ADD).params(buildDevelopParams(watchtower, DevelopmentId.Watchtower)).build())
			.category(ActionCategory.Develop)
			.order(developCategoryOrder + 3)
			.focus(watchtower.focus ?? Focus.Economy)
			.build(),
	);
}
