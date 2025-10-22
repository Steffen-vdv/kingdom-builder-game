import { describe, it, expect } from 'vitest';
import { createTestEngine } from '../helpers.ts';
import { applyDeveloperPreset } from '../../src/runtime/developer_preset.ts';
import { createContentFactory } from '@kingdom-builder/testing';
import {
	Resource as CResource,
	PopulationRole,
} from '@kingdom-builder/contents';
import type { PlayerId } from '../../src/state';

describe('applyDeveloperPreset', () => {
	it('targets the requested player without affecting others', () => {
		const content = createContentFactory();
		const farmstead = content.development();
		const workshop = content.development();
		const hall = content.building();
		const ctx = createTestEngine(content);
		const player = ctx.game.players[0]!;
		const opponent = ctx.game.players[1]!;
		const initialLandIds = new Set(player.lands.map((land) => land.id));
		const opponentGoldBefore = opponent.resources[CResource.gold] ?? 0;
		const opponentHappinessBefore =
			opponent.resources[CResource.happiness] ?? 0;
		const opponentCastleBefore = opponent.resources[CResource.castleHP] ?? 0;
		const opponentPopulationBefore =
			opponent.population[PopulationRole.Council] ?? 0;
		const opponentLandCountBefore = opponent.lands.length;
		const opponentDevelopmentIdsBefore = opponent.lands.flatMap((land) => {
			return [...land.developments];
		});
		const opponentBuildingsBefore = Array.from(opponent.buildings);
		const initialLandCount = player.lands.length;
		for (const land of player.lands) {
			land.slotsUsed = land.slotsMax;
		}
		const goldTarget = (player.resources[CResource.gold] ?? 0) + 5;
		const happinessTarget = (player.resources[CResource.happiness] ?? 0) + 3;
		const castleBefore = player.resources[CResource.castleHP] ?? 0;
		const castleTarget = Math.max(castleBefore - 2, 0);
		const fortifierTarget =
			(player.population[PopulationRole.Fortifier] ?? 0) + 2;
		const landCountTarget = initialLandCount + 1;
		applyDeveloperPreset(ctx, {
			playerId: player.id,
			resources: [
				{ key: CResource.gold, target: goldTarget },
				{ key: CResource.happiness, target: happinessTarget },
				{ key: CResource.castleHP, target: castleTarget },
			],
			population: [
				{ role: PopulationRole.Council, count: 0 },
				{ role: PopulationRole.Fortifier, count: fortifierTarget },
			],
			landCount: landCountTarget,
			developments: [farmstead.id, workshop.id],
			buildings: [hall.id],
		});
		expect(player.resources[CResource.gold]).toBe(goldTarget);
		expect(player.resources[CResource.happiness]).toBe(happinessTarget);
		expect(player.resources[CResource.castleHP]).toBe(castleTarget);
		expect(player.population[PopulationRole.Council]).toBe(0);
		expect(player.population[PopulationRole.Fortifier]).toBe(fortifierTarget);
		expect(player.lands.length).toBeGreaterThanOrEqual(landCountTarget);
		const landIdsAfter = new Set(player.lands.map((land) => land.id));
		let newLandCount = 0;
		for (const id of landIdsAfter) {
			if (!initialLandIds.has(id)) {
				newLandCount += 1;
			}
		}
		expect(newLandCount).toBeGreaterThanOrEqual(2);
		const ownedDevelopments = player.lands.flatMap((land) => {
			return [...land.developments];
		});
		expect(ownedDevelopments).toContain(farmstead.id);
		expect(ownedDevelopments).toContain(workshop.id);
		expect(player.buildings.has(hall.id)).toBe(true);
		expect(opponent.resources[CResource.gold]).toBe(opponentGoldBefore);
		expect(opponent.resources[CResource.happiness]).toBe(
			opponentHappinessBefore,
		);
		expect(opponent.resources[CResource.castleHP]).toBe(opponentCastleBefore);
		expect(opponent.population[PopulationRole.Council]).toBe(
			opponentPopulationBefore,
		);
		expect(opponent.lands.length).toBe(opponentLandCountBefore);
		const opponentDevelopmentsAfter = opponent.lands.flatMap((land) => {
			return [...land.developments];
		});
		expect(opponentDevelopmentsAfter).toEqual(opponentDevelopmentIdsBefore);
		expect(Array.from(opponent.buildings)).toEqual(opponentBuildingsBefore);
	});

	it('ignores unknown players and is idempotent for satisfied targets', () => {
		const content = createContentFactory();
		const workshop = content.development();
		const hall = content.building();
		const ctx = createTestEngine(content);
		const player = ctx.game.players[0]!;
		const goldBefore = player.resources[CResource.gold] ?? 0;
		const landsBefore = player.lands.map((land) => land.id);
		applyDeveloperPreset(ctx, {
			playerId: 'unknown-player' as PlayerId,
			resources: [{ key: CResource.gold, target: goldBefore + 7 }],
			landCount: player.lands.length + 2,
			developments: [workshop.id],
			buildings: [hall.id],
		});
		expect(player.resources[CResource.gold]).toBe(goldBefore);
		expect(player.lands.map((land) => land.id)).toEqual(landsBefore);
		const landCountTarget = player.lands.length + 1;
		for (const land of player.lands) {
			land.slotsUsed = land.slotsMax;
		}
		applyDeveloperPreset(ctx, {
			playerId: player.id,
			resources: [{ key: CResource.gold, target: goldBefore + 2 }],
			landCount: landCountTarget,
			developments: [workshop.id],
			buildings: [hall.id],
		});
		const goldAfterFirst = player.resources[CResource.gold] ?? 0;
		const landIdsAfterFirst = player.lands.map((land) => land.id);
		const developmentCountAfterFirst = player.lands.reduce((total, land) => {
			const count = land.developments.filter((id) => id === workshop.id).length;
			return total + count;
		}, 0);
		const landTotalAfterFirst = player.lands.length;
		const buildingOwnedAfterFirst = player.buildings.has(hall.id);
		applyDeveloperPreset(ctx, {
			playerId: player.id,
			resources: [{ key: CResource.gold, target: goldBefore + 2 }],
			landCount: landCountTarget,
			developments: [workshop.id],
			buildings: [hall.id],
		});
		const developmentCountAfterSecond = player.lands.reduce((total, land) => {
			const count = land.developments.filter((id) => id === workshop.id).length;
			return total + count;
		}, 0);
		expect(player.resources[CResource.gold]).toBe(goldAfterFirst);
		expect(player.lands.map((land) => land.id)).toEqual(landIdsAfterFirst);
		expect(player.lands.length).toBe(landTotalAfterFirst);
		expect(developmentCountAfterSecond).toBe(developmentCountAfterFirst);
		expect(player.buildings.has(hall.id)).toBe(buildingOwnedAfterFirst);
	});
});
