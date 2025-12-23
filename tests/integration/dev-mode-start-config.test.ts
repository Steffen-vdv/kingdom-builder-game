import { describe, it, expect } from 'vitest';
import { createEngineSession } from '@kingdom-builder/engine';
import {
	ACTIONS,
	BUILDINGS,
	DEVELOPMENTS,
	PHASES,
	RULES,
	Resource,
	getResourceId,
	RESOURCE_REGISTRY,
	RESOURCE_GROUP_REGISTRY,
	ActionId,
} from '@kingdom-builder/contents';
import { DevelopmentId } from '@kingdom-builder/contents/developments';
import type { EffectConfig } from '@kingdom-builder/protocol';

// ============================================================================
// CONTENT-DERIVED VALUES
// ============================================================================

/**
 * Extract resource amounts from the dev mode initial setup action.
 * This parses the action definition to get the expected starting values.
 */
function getDevModeStartingResources(): Map<string, number> {
	const devModeAction = ACTIONS.get(ActionId.initial_setup_devmode);
	if (!devModeAction?.effects) {
		throw new Error('Dev mode initial setup action not found');
	}

	const resources = new Map<string, number>();

	for (const effect of devModeAction.effects as EffectConfig[]) {
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
 * Count the number of a specific development type added by an action.
 */
function countDevelopmentsInAction(
	actionId: string,
	developmentId: string,
): number {
	const action = ACTIONS.get(actionId);
	if (!action?.effects) {
		return 0;
	}

	let count = 0;
	for (const effect of action.effects as EffectConfig[]) {
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
const DEV_MODE_HOUSE_COUNT = countDevelopmentsInAction(
	ActionId.initial_setup_devmode,
	DevelopmentId.House,
);

describe('dev mode start configuration', () => {
	it('applies content-driven overrides when dev mode is enabled', () => {
		const session = createEngineSession({
			actions: ACTIONS,
			buildings: BUILDINGS,
			developments: DEVELOPMENTS,
			phases: PHASES,
			rules: RULES,
			resourceCatalog: {
				resources: RESOURCE_REGISTRY,
				groups: RESOURCE_GROUP_REGISTRY,
			},
			devMode: true,
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
		expect(snapshot.game.devMode).toBe(true);
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
		// CP starts at 0; it is granted during the Growth phase by Council members
		expect(player.values[cpId]).toBe(0);
		expect(player.resourceBounds[goldId]?.lowerBound).toBe(0);
		expect(snapshot.game.resourceCatalog.resources.byId[goldId]).toBeDefined();
	});

	it('applies onBuild effects for start config developments', () => {
		const session = createEngineSession({
			actions: ACTIONS,
			buildings: BUILDINGS,
			developments: DEVELOPMENTS,
			phases: PHASES,
			rules: RULES,
			resourceCatalog: {
				resources: RESOURCE_REGISTRY,
				groups: RESOURCE_GROUP_REGISTRY,
			},
			devMode: true,
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
