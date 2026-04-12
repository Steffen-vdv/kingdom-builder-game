import { describe, it, expect } from 'vitest';
import { createEngineSession } from '@kingdom-builder/engine';
import {
	Resource,
	getResourceId,
	ActionId,
	DevelopmentId,
	createDevModePackage,
} from '@kingdom-builder/contents';
import type { EffectConfig } from '@kingdom-builder/protocol';

// ============================================================================
// CONTENT-DERIVED VALUES
// ============================================================================

/**
 * Extract resource amounts from the dev mode initial setup action.
 * The dev-mode content package overrides initial_setup with dev resources.
 */
function getDevModeStartingResources(): Map<string, number> {
	const devModePackage = createDevModePackage();
	// In dev-mode package, initial_setup has the dev resources
	const devModeAction = devModePackage.actions.get(ActionId.initial_setup);
	const effects = devModeAction?.tiers?.['1']?.effects ?? [];
	if (effects.length === 0) {
		throw new Error(
			'Dev mode initial setup action not found or has no effects',
		);
	}

	const resources = new Map<string, number>();

	for (const effect of effects as EffectConfig[]) {
		if (effect.type === 'resource' && effect.method === 'add') {
			const params = effect.params as {
				resourceId?: string;
				change?: { type: string; amount?: number };
			};
			if (params.resourceId && params.change?.type === 'amount') {
				resources.set(params.resourceId, params.change.amount ?? 0);
			}
		}
	}

	return resources;
}

/**
 * Count the number of a specific development type added by the dev mode
 * setup action.
 */
function countDevelopmentsInDevModeSetup(developmentId: string): number {
	const devModePackage = createDevModePackage();
	const action = devModePackage.actions.get(ActionId.initial_setup);
	const effects = action?.tiers?.['1']?.effects ?? [];
	if (effects.length === 0) {
		return 0;
	}

	let count = 0;
	for (const effect of effects as EffectConfig[]) {
		if (effect.type === 'development' && effect.method === 'add') {
			const params = effect.params as { id?: string };
			if (params.id === developmentId) {
				count++;
			}
		}
	}
	return count;
}

const DEV_MODE_RESOURCES = getDevModeStartingResources();
const DEV_MODE_HOUSE_COUNT = countDevelopmentsInDevModeSetup(
	DevelopmentId.House,
);

describe('dev mode start configuration', () => {
	it('applies content-driven overrides when using dev-mode content package', () => {
		// Load the dev-mode content package which has boosted starting resources
		const devModeContent = createDevModePackage();

		const session = createEngineSession({
			actions: devModeContent.actions,
			actionMetaCategories: devModeContent.actionMetaCategories,
			buildings: devModeContent.buildings,
			developments: devModeContent.developments,
			phases: devModeContent.phases,
			rules: devModeContent.rules,
			resourceCatalog: devModeContent.resourceCatalog,
		});

		const snapshot = session.getSnapshot();
		const [player, opponent] = snapshot.game.players;
		if (!player || !opponent) {
			throw new Error('Expected both players to be present at game start');
		}
		const goldId = getResourceId(Resource.gold);
		const happinessId = getResourceId(Resource.happiness);
		const cpId = getResourceId(Resource.cp);
		const castleId = getResourceId(Resource.castleHP);
		const councilId = getResourceId(Resource.council);
		const legionId = getResourceId(Resource.legion);
		const fortifierId = getResourceId(Resource.fortifier);
		// Verify resource values match the dev mode action configuration
		expect(player.values[goldId]).toBe(DEV_MODE_RESOURCES.get(goldId));
		expect(player.values[happinessId]).toBe(
			DEV_MODE_RESOURCES.get(happinessId),
		);
		expect(player.values[councilId]).toBe(DEV_MODE_RESOURCES.get(councilId));
		expect(player.values[legionId]).toBe(DEV_MODE_RESOURCES.get(legionId));
		expect(player.values[fortifierId]).toBe(
			DEV_MODE_RESOURCES.get(fortifierId),
		);
		expect(opponent.values[castleId]).toBe(DEV_MODE_RESOURCES.get(castleId));
		// CP starts at 0; it is granted during the Upkeep phase by Council members
		expect(player.values[cpId]).toBe(0);
		expect(player.resourceBounds[goldId]?.lowerBound).toBe(0);
		expect(snapshot.game.resourceCatalog.resources.byId[goldId]).toBeDefined();
	});

	it('applies onBuild effects for start config developments', () => {
		// Load the dev-mode content package
		const devModeContent = createDevModePackage();

		const session = createEngineSession({
			actions: devModeContent.actions,
			actionMetaCategories: devModeContent.actionMetaCategories,
			buildings: devModeContent.buildings,
			developments: devModeContent.developments,
			phases: devModeContent.phases,
			rules: devModeContent.rules,
			resourceCatalog: devModeContent.resourceCatalog,
		});
		const snapshot = session.getSnapshot();
		const [player] = snapshot.game.players;
		if (!player) {
			throw new Error('Expected player to be present at game start');
		}
		// Count houses in devmode - should match the action definition
		const houseCount = player.lands.reduce((count, land) => {
			return (
				count +
				land.developments.filter((dev) => dev === DevelopmentId.House).length
			);
		}, 0);
		expect(houseCount).toBe(DEV_MODE_HOUSE_COUNT);
		// Each house adds +1 to max population via onBuild effect
		// Base populationMax comes from dev mode action
		const populationMaxId = Resource.populationMax;
		const basePopMax =
			DEV_MODE_RESOURCES.get(getResourceId(Resource.populationMax)) ?? 0;
		expect(player.values[populationMaxId]).toBe(
			basePopMax + DEV_MODE_HOUSE_COUNT,
		);
	});
});
