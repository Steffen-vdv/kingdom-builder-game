/**
 * Byte-Sized Empire — Build & Develop Action Definitions
 *
 * Extracted from the main actions file to stay under 400 lines.
 * Build actions unlock buildings; develop actions place
 * developments on land slots.
 */
import type { ActionConfig, RequirementConfig } from '@kingdom-builder/protocol';
import {
	Types,
	BuildingMethods,
	DevelopmentMethods,
	action,
} from '@kingdom-builder/contents-sdk';
import {
	effect,
	buildingParams,
	developmentParams,
	compareRequirement,
	landEvaluator,
} from '../infrastructure/builders';
import { Act, Res, Building, Dev, MetaCat, ActionCat } from './ids';

type ActionEntry = { id: string; def: ActionConfig };

const devSlotReq: RequirementConfig = compareRequirement()
	.left(landEvaluator())
	.operator('gt')
	.right(0)
	.message('Requires an available development slot.')
	.build();

// ═════════════════════════════════════════════════════════════
// BUILD ACTIONS — one per building, all locked + oneTime
// ═════════════════════════════════════════════════════════════

const BUILDINGS: ReadonlyArray<{
	actId: string;
	bldId: string;
	name: string;
	icon: string;
	order: number;
}> = [
	{ actId: Act.buildFarmComplex, bldId: Building.farmComplex, name: 'Farm Complex', icon: '🏗️', order: 100 },
	{ actId: Act.buildGranary, bldId: Building.granary, name: 'Granary', icon: '🏛️', order: 101 },
	{ actId: Act.buildWorkshop, bldId: Building.workshop, name: 'Workshop', icon: '🔨', order: 102 },
	{ actId: Act.buildMarket, bldId: Building.market, name: 'Market', icon: '🏪', order: 103 },
	{ actId: Act.buildLibrary, bldId: Building.library, name: 'Library', icon: '📖', order: 104 },
	{ actId: Act.buildAcademy, bldId: Building.academy, name: 'Academy', icon: '🎓', order: 105 },
	{ actId: Act.buildTemple, bldId: Building.temple, name: 'Temple', icon: '⛪', order: 106 },
	{ actId: Act.buildTavern, bldId: Building.tavern, name: 'Tavern', icon: '🍺', order: 107 },
	{ actId: Act.buildBarracks, bldId: Building.barracks, name: 'Barracks', icon: '⚔️', order: 108 },
	{ actId: Act.buildFortress, bldId: Building.fortress, name: 'Fortress', icon: '🏰', order: 109 },
	{ actId: Act.buildTownHall, bldId: Building.townHall, name: 'Town Hall', icon: '🏛️', order: 110 },
	{ actId: Act.buildMonument, bldId: Building.monument, name: 'Monument', icon: '🗿', order: 111 },
];

function buildActions(): ActionEntry[] {
	return BUILDINGS.map(({ actId, bldId, name, icon, order }) => {
		const def = action()
			.id(actId)
			.metaCategory(MetaCat.commands)
			.name(name)
			.icon(icon)
			.locked()
			.effect(
				effect(Types.Building, BuildingMethods.ADD)
					.params(buildingParams().id(bldId).build())
					.build(),
			)
			.category(ActionCat.build)
			.order(order)
			.build();
		def.oneTime = true;
		return { id: actId, def };
	});
}

// ═════════════════════════════════════════════════════════════
// DEVELOP ACTIONS — one per development type
// ═════════════════════════════════════════════════════════════

const DEVELOPMENTS: ReadonlyArray<{
	actId: string;
	devId: string;
	name: string;
	icon: string;
	order: number;
	costs: ReadonlyArray<[string, number]>;
	locked: boolean;
}> = [
	{ actId: Act.developFarm, devId: Dev.farm, name: 'Farm', icon: '🌾', order: 200, costs: [[Res.gold, 2]], locked: false },
	{ actId: Act.developMine, devId: Dev.mine, name: 'Mine', icon: '⛏️', order: 201, costs: [[Res.gold, 2], [Res.materials, 1]], locked: false },
	{ actId: Act.developCottage, devId: Dev.cottage, name: 'Cottage', icon: '🏠', order: 202, costs: [[Res.gold, 2], [Res.materials, 1]], locked: false },
	{ actId: Act.developSchool, devId: Dev.school, name: 'School', icon: '📚', order: 203, costs: [[Res.gold, 3]], locked: true },
	{ actId: Act.developGarden, devId: Dev.garden, name: 'Garden', icon: '🌿', order: 204, costs: [[Res.gold, 2], [Res.influence, 1]], locked: true },
	{ actId: Act.developTradingPost, devId: Dev.tradingPost, name: 'Trading Post', icon: '🏪', order: 205, costs: [[Res.gold, 3], [Res.materials, 1]], locked: true },
];

function developActions(): ActionEntry[] {
	return DEVELOPMENTS.map(
		({ actId, devId, name, icon, order, costs, locked }) => {
			const builder = action()
				.id(actId)
				.metaCategory(MetaCat.commands)
				.name(name)
				.icon(icon);

			if (locked) {
				builder.locked();
			}

			for (const [resId, amount] of costs) {
				builder.cost(resId, amount);
			}
			builder
				.requirement(devSlotReq)
				.effect(
					effect(Types.Development, DevelopmentMethods.ADD)
						.params(
							developmentParams()
								.id(devId)
								.landId('$landId')
								.build(),
						)
						.build(),
				)
				.category(ActionCat.develop)
				.order(order);

			return { id: actId, def: builder.build() };
		},
	);
}

export function allBuildActions(): ActionEntry[] {
	return buildActions();
}

export function allDevelopActions(): ActionEntry[] {
	return developActions();
}
