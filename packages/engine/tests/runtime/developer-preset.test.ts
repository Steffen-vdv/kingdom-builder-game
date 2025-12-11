import { describe, it, expect } from 'vitest';
import { createTestEngine } from '../helpers.ts';
import { applyDeveloperPreset } from '../../src/runtime/developer_preset.ts';
import { createContentFactory } from '@kingdom-builder/testing';
import { Resource as CResource } from '@kingdom-builder/contents';
import type { PlayerId } from '../../src/state';

describe('applyDeveloperPreset', () => {
	it('targets the requested player without affecting others', () => {
		const content = createContentFactory();
		const farmstead = content.development();
		const workshop = content.development();
		const hall = content.building();
		const ctx = createTestEngine({ ...content, skipInitialSetup: true });
		const player = ctx.game.players[0]!;
		const opponent = ctx.game.players[1]!;
		const initialLandIds = new Set(player.lands.map((land) => land.id));
		// PlayerState uses resourceValues for all resources, stats, and population
		const opponentGoldBefore = opponent.resourceValues[CResource.gold] ?? 0;
		const opponentHappinessBefore =
			opponent.resourceValues[CResource.happiness] ?? 0;
		const opponentCastleBefore =
			opponent.resourceValues[CResource.castleHP] ?? 0;
		// PopulationRole values ARE Resource IDs - access via resourceValues
		const opponentPopulationBefore =
			opponent.resourceValues[CResource.council] ?? 0;
		const opponentLandCountBefore = opponent.lands.length;
		const opponentDevelopmentIdsBefore = opponent.lands.flatMap((land) => {
			return [...land.developments];
		});
		const opponentBuildingsBefore = Array.from(opponent.buildings);
		const initialLandCount = player.lands.length;
		for (const land of player.lands) {
			land.slotsUsed = land.slotsMax;
		}
		const goldTarget = (player.resourceValues[CResource.gold] ?? 0) + 5;
		const happinessTarget =
			(player.resourceValues[CResource.happiness] ?? 0) + 3;
		const castleBefore = player.resourceValues[CResource.castleHP] ?? 0;
		const castleTarget = Math.max(castleBefore - 2, 0);
		const fortifierTarget =
			(player.resourceValues[CResource.fortifier] ?? 0) + 2;
		const landCountTarget = initialLandCount + 1;
		applyDeveloperPreset(ctx, {
			playerId: player.id,
			resources: [
				{ resourceId: CResource.gold, target: goldTarget },
				{ resourceId: CResource.happiness, target: happinessTarget },
				{ resourceId: CResource.castleHP, target: castleTarget },
			],
			population: [
				{ role: CResource.council, count: 0 },
				{ role: CResource.fortifier, count: fortifierTarget },
			],
			landCount: landCountTarget,
			developments: [farmstead.id, workshop.id],
			buildings: [hall.id],
		});
		expect(player.resourceValues[CResource.gold]).toBe(goldTarget);
		expect(player.resourceValues[CResource.happiness]).toBe(happinessTarget);
		// When skipInitialSetup is true and target equals 0, the value may remain
		// undefined since getResourceValue defaults undefined to 0
		expect(player.resourceValues[CResource.castleHP] ?? 0).toBe(castleTarget);
		expect(player.resourceValues[CResource.council] ?? 0).toBe(0);
		expect(player.resourceValues[CResource.fortifier] ?? 0).toBe(
			fortifierTarget,
		);
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
		expect(opponent.resourceValues[CResource.gold] ?? 0).toBe(
			opponentGoldBefore,
		);
		expect(opponent.resourceValues[CResource.happiness] ?? 0).toBe(
			opponentHappinessBefore,
		);
		expect(opponent.resourceValues[CResource.castleHP] ?? 0).toBe(
			opponentCastleBefore,
		);
		expect(opponent.resourceValues[CResource.council] ?? 0).toBe(
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
		const ctx = createTestEngine({ ...content, skipInitialSetup: true });
		const player = ctx.game.players[0]!;
		const goldBefore = player.resourceValues[CResource.gold] ?? 0;
		const landsBefore = player.lands.map((land) => land.id);
		applyDeveloperPreset(ctx, {
			playerId: 'unknown-player' as PlayerId,
			resources: [{ resourceId: CResource.gold, target: goldBefore + 7 }],
			landCount: player.lands.length + 2,
			developments: [workshop.id],
			buildings: [hall.id],
		});
		// With skipInitialSetup, gold remains undefined (treated as 0)
		expect(player.resourceValues[CResource.gold] ?? 0).toBe(goldBefore);
		expect(player.lands.map((land) => land.id)).toEqual(landsBefore);
		const landCountTarget = player.lands.length + 1;
		for (const land of player.lands) {
			land.slotsUsed = land.slotsMax;
		}
		applyDeveloperPreset(ctx, {
			playerId: player.id,
			resources: [{ resourceId: CResource.gold, target: goldBefore + 2 }],
			landCount: landCountTarget,
			developments: [workshop.id],
			buildings: [hall.id],
		});
		const goldAfterFirst = player.resourceValues[CResource.gold] ?? 0;
		const landIdsAfterFirst = player.lands.map((land) => land.id);
		const developmentCountAfterFirst = player.lands.reduce((total, land) => {
			const count = land.developments.filter((id) => id === workshop.id).length;
			return total + count;
		}, 0);
		const landTotalAfterFirst = player.lands.length;
		const buildingOwnedAfterFirst = player.buildings.has(hall.id);
		applyDeveloperPreset(ctx, {
			playerId: player.id,
			resources: [{ resourceId: CResource.gold, target: goldBefore + 2 }],
			landCount: landCountTarget,
			developments: [workshop.id],
			buildings: [hall.id],
		});
		const developmentCountAfterSecond = player.lands.reduce((total, land) => {
			const count = land.developments.filter((id) => id === workshop.id).length;
			return total + count;
		}, 0);
		expect(player.resourceValues[CResource.gold]).toBe(goldAfterFirst);
		expect(player.lands.map((land) => land.id)).toEqual(landIdsAfterFirst);
		expect(player.lands.length).toBe(landTotalAfterFirst);
		expect(developmentCountAfterSecond).toBe(developmentCountAfterFirst);
		expect(player.buildings.has(hall.id)).toBe(buildingOwnedAfterFirst);
	});
});
