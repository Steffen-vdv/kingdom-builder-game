import type { Registry } from '@kingdom-builder/protocol';
import { BUILDINGS } from '../buildings';
import { BuildingId } from '../buildingIds';
import type { ActionDef } from '../actions';
import { BuildActionId } from '../actionIds';
import { ActionCategoryId as ActionCategory, ACTION_CATEGORIES } from '../actionCategories';
import { action, buildingParams, effect } from '../config/builders';
import { Types, BuildingMethods } from '../config/builderShared';
import { Focus } from '../defs';

const categoryOrder = (categoryId: keyof typeof ActionCategory) => {
        const category = ACTION_CATEGORIES.get(ActionCategory[categoryId]);
        if (!category) {
                throw new Error(
                        `Missing action category definition for id "${ActionCategory[categoryId]}".`,
                );
        }
        return category.order ?? 0;
};

const buildCategoryOrder = categoryOrder('Build');

function requireBuilding(id: BuildingId) {
        const definition = BUILDINGS.get(id);
        if (!definition) {
                throw new Error(`Missing building definition for id "${id}".`);
        }
        const { name, icon, focus } = definition;
        if (!name) {
                throw new Error(`Building "${id}" is missing a name.`);
        }
        if (!icon) {
                throw new Error(`Building "${id}" is missing an icon.`);
        }
        return { name, icon, focus };
}

export function registerBuildActions(registry: Registry<ActionDef>) {
        const townCharter = requireBuilding(BuildingId.TownCharter);
        registry.add(
                BuildActionId.build_town_charter,
                action()
                        .id(BuildActionId.build_town_charter)
                        .name(townCharter.name)
                        .icon(townCharter.icon)
                        .effect(
                                effect(Types.Building, BuildingMethods.ADD)
                                        .params(buildingParams().id(BuildingId.TownCharter))
                                        .build(),
                        )
                        .category(ActionCategory.Build)
                        .order(buildCategoryOrder + 0)
                        .focus(townCharter.focus ?? Focus.Other)
                        .build(),
        );

        const mill = requireBuilding(BuildingId.Mill);
        registry.add(
                BuildActionId.build_mill,
                action()
                        .id(BuildActionId.build_mill)
                        .name(mill.name)
                        .icon(mill.icon)
                        .effect(
                                effect(Types.Building, BuildingMethods.ADD)
                                        .params(buildingParams().id(BuildingId.Mill))
                                        .build(),
                        )
                        .category(ActionCategory.Build)
                        .order(buildCategoryOrder + 1)
                        .focus(mill.focus ?? Focus.Other)
                        .build(),
        );

        const raidersGuild = requireBuilding(BuildingId.RaidersGuild);
        registry.add(
                BuildActionId.build_raiders_guild,
                action()
                        .id(BuildActionId.build_raiders_guild)
                        .name(raidersGuild.name)
                        .icon(raidersGuild.icon)
                        .effect(
                                effect(Types.Building, BuildingMethods.ADD)
                                        .params(buildingParams().id(BuildingId.RaidersGuild))
                                        .build(),
                        )
                        .category(ActionCategory.Build)
                        .order(buildCategoryOrder + 2)
                        .focus(raidersGuild.focus ?? Focus.Other)
                        .build(),
        );

        const plowWorkshop = requireBuilding(BuildingId.PlowWorkshop);
        registry.add(
                BuildActionId.build_plow_workshop,
                action()
                        .id(BuildActionId.build_plow_workshop)
                        .name(plowWorkshop.name)
                        .icon(plowWorkshop.icon)
                        .effect(
                                effect(Types.Building, BuildingMethods.ADD)
                                        .params(buildingParams().id(BuildingId.PlowWorkshop))
                                        .build(),
                        )
                        .category(ActionCategory.Build)
                        .order(buildCategoryOrder + 3)
                        .focus(plowWorkshop.focus ?? Focus.Other)
                        .build(),
        );

        const market = requireBuilding(BuildingId.Market);
        registry.add(
                BuildActionId.build_market,
                action()
                        .id(BuildActionId.build_market)
                        .name(market.name)
                        .icon(market.icon)
                        .effect(
                                effect(Types.Building, BuildingMethods.ADD)
                                        .params(buildingParams().id(BuildingId.Market))
                                        .build(),
                        )
                        .category(ActionCategory.Build)
                        .order(buildCategoryOrder + 4)
                        .focus(market.focus ?? Focus.Other)
                        .build(),
        );

        const barracks = requireBuilding(BuildingId.Barracks);
        registry.add(
                BuildActionId.build_barracks,
                action()
                        .id(BuildActionId.build_barracks)
                        .name(barracks.name)
                        .icon(barracks.icon)
                        .effect(
                                effect(Types.Building, BuildingMethods.ADD)
                                        .params(buildingParams().id(BuildingId.Barracks))
                                        .build(),
                        )
                        .category(ActionCategory.Build)
                        .order(buildCategoryOrder + 5)
                        .focus(barracks.focus ?? Focus.Other)
                        .build(),
        );

        const citadel = requireBuilding(BuildingId.Citadel);
        registry.add(
                BuildActionId.build_citadel,
                action()
                        .id(BuildActionId.build_citadel)
                        .name(citadel.name)
                        .icon(citadel.icon)
                        .effect(
                                effect(Types.Building, BuildingMethods.ADD)
                                        .params(buildingParams().id(BuildingId.Citadel))
                                        .build(),
                        )
                        .category(ActionCategory.Build)
                        .order(buildCategoryOrder + 6)
                        .focus(citadel.focus ?? Focus.Other)
                        .build(),
        );

        const castleWalls = requireBuilding(BuildingId.CastleWalls);
        registry.add(
                BuildActionId.build_castle_walls,
                action()
                        .id(BuildActionId.build_castle_walls)
                        .name(castleWalls.name)
                        .icon(castleWalls.icon)
                        .effect(
                                effect(Types.Building, BuildingMethods.ADD)
                                        .params(buildingParams().id(BuildingId.CastleWalls))
                                        .build(),
                        )
                        .category(ActionCategory.Build)
                        .order(buildCategoryOrder + 7)
                        .focus(castleWalls.focus ?? Focus.Other)
                        .build(),
        );

        const castleGardens = requireBuilding(BuildingId.CastleGardens);
        registry.add(
                BuildActionId.build_castle_gardens,
                action()
                        .id(BuildActionId.build_castle_gardens)
                        .name(castleGardens.name)
                        .icon(castleGardens.icon)
                        .effect(
                                effect(Types.Building, BuildingMethods.ADD)
                                        .params(buildingParams().id(BuildingId.CastleGardens))
                                        .build(),
                        )
                        .category(ActionCategory.Build)
                        .order(buildCategoryOrder + 8)
                        .focus(castleGardens.focus ?? Focus.Other)
                        .build(),
        );

        const temple = requireBuilding(BuildingId.Temple);
        registry.add(
                BuildActionId.build_temple,
                action()
                        .id(BuildActionId.build_temple)
                        .name(temple.name)
                        .icon(temple.icon)
                        .effect(
                                effect(Types.Building, BuildingMethods.ADD)
                                        .params(buildingParams().id(BuildingId.Temple))
                                        .build(),
                        )
                        .category(ActionCategory.Build)
                        .order(buildCategoryOrder + 9)
                        .focus(temple.focus ?? Focus.Other)
                        .build(),
        );

        const palace = requireBuilding(BuildingId.Palace);
        registry.add(
                BuildActionId.build_palace,
                action()
                        .id(BuildActionId.build_palace)
                        .name(palace.name)
                        .icon(palace.icon)
                        .effect(
                                effect(Types.Building, BuildingMethods.ADD)
                                        .params(buildingParams().id(BuildingId.Palace))
                                        .build(),
                        )
                        .category(ActionCategory.Build)
                        .order(buildCategoryOrder + 10)
                        .focus(palace.focus ?? Focus.Other)
                        .build(),
        );

        const greatHall = requireBuilding(BuildingId.GreatHall);
        registry.add(
                BuildActionId.build_great_hall,
                action()
                        .id(BuildActionId.build_great_hall)
                        .name(greatHall.name)
                        .icon(greatHall.icon)
                        .effect(
                                effect(Types.Building, BuildingMethods.ADD)
                                        .params(buildingParams().id(BuildingId.GreatHall))
                                        .build(),
                        )
                        .category(ActionCategory.Build)
                        .order(buildCategoryOrder + 11)
                        .focus(greatHall.focus ?? Focus.Other)
                        .build(),
        );
}
