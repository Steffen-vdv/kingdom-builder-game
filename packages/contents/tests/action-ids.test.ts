import { describe, expect, it } from 'vitest';
import {
	ActionId,
	actionIdForBuilding,
	actionIdForDevelopment,
	actionIdForHireableRole,
	buildingIdFromAction,
	developmentIdFromAction,
	hireableRoleFromAction,
	HIREABLE_POPULATION_ROLE_IDS,
	type HireablePopulationRoleId,
} from '../src/actions';
import { DevelopmentId } from '../src/developments';
import { BuildingId } from '../src/buildingIds';
import { PopulationRole } from '../src/populationRoles';

describe('action id helpers', () => {
	describe('development ids', () => {
		const expected: Record<DevelopmentId, ActionId> = {
			[DevelopmentId.Farm]: ActionId.develop_farm,
			[DevelopmentId.House]: ActionId.develop_house,
			[DevelopmentId.Outpost]: ActionId.develop_outpost,
			[DevelopmentId.Watchtower]: ActionId.develop_watchtower,
			[DevelopmentId.Garden]: ActionId.develop_garden,
		};

		it('maps development ids to action ids', () => {
			Object.entries(expected).forEach(([developmentId, actionId]) => {
				expect(actionIdForDevelopment(developmentId as DevelopmentId)).toBe(
					actionId,
				);
			});
		});

		it('maps development action ids back to development ids', () => {
			Object.entries(expected).forEach(([developmentId, actionId]) => {
				expect(developmentIdFromAction(actionId)).toBe(developmentId);
			});
		});

		it('returns undefined for non-development action ids', () => {
			expect(developmentIdFromAction(ActionId.army_attack)).toBeUndefined();
		});
	});

	describe('building ids', () => {
		const expected: Record<BuildingId, ActionId> = {
			[BuildingId.TownCharter]: ActionId.build_town_charter,
			[BuildingId.Mill]: ActionId.build_mill,
			[BuildingId.RaidersGuild]: ActionId.build_raiders_guild,
			[BuildingId.PlowWorkshop]: ActionId.build_plow_workshop,
			[BuildingId.Market]: ActionId.build_market,
			[BuildingId.Barracks]: ActionId.build_barracks,
			[BuildingId.Citadel]: ActionId.build_citadel,
			[BuildingId.CastleWalls]: ActionId.build_castle_walls,
			[BuildingId.CastleGardens]: ActionId.build_castle_gardens,
			[BuildingId.Temple]: ActionId.build_temple,
			[BuildingId.Palace]: ActionId.build_palace,
			[BuildingId.GreatHall]: ActionId.build_great_hall,
		};

		it('maps building ids to action ids', () => {
			Object.entries(expected).forEach(([buildingId, actionId]) => {
				expect(actionIdForBuilding(buildingId as BuildingId)).toBe(actionId);
			});
		});

		it('maps building action ids back to building ids', () => {
			Object.entries(expected).forEach(([buildingId, actionId]) => {
				expect(buildingIdFromAction(actionId)).toBe(buildingId);
			});
		});

		it('returns undefined for non-building action ids', () => {
			expect(buildingIdFromAction(ActionId.expand)).toBeUndefined();
		});
	});

	describe('hireable roles', () => {
		const expected: Record<HireablePopulationRoleId, ActionId> = {
			[PopulationRole.Council]: ActionId.hire_council,
			[PopulationRole.Legion]: ActionId.hire_legion,
			[PopulationRole.Fortifier]: ActionId.hire_fortifier,
		};

		it('maps hireable roles to action ids', () => {
			HIREABLE_POPULATION_ROLE_IDS.forEach((roleId) => {
				expect(actionIdForHireableRole(roleId)).toBe(expected[roleId]);
			});
		});

		it('maps hire action ids back to hireable roles', () => {
			Object.entries(expected).forEach(([roleId, actionId]) => {
				expect(hireableRoleFromAction(actionId)).toBe(roleId);
			});
		});

		it('returns undefined for non-hire action ids', () => {
			expect(hireableRoleFromAction(ActionId.plunder)).toBeUndefined();
		});
	});
});
