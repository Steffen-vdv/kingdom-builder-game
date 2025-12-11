import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import {
	Resource as CResource,
	PhaseId,
	buildResourceCatalog,
} from '@kingdom-builder/contents';
import { createTestEngine } from './helpers';
import { createContentFactory } from '@kingdom-builder/testing';
import { advance, performAction, getActionCosts, snapshotPlayer } from '../src';
import {
	getCatalogIndexes,
	createRuntimeResourceCatalog,
} from '../src/resource';
import { resourceAmountParams } from './helpers/resourceParams';

function toMain(engineContext: ReturnType<typeof createTestEngine>) {
	while (engineContext.game.currentPhase !== PhaseId.Main) {
		advance(engineContext);
	}
}

/**
 * Get resource IDs that can be tested with simple add/remove effects.
 * Excludes:
 * - Resources with globalCost: Reserved as global action costs
 * - Group parent resources: Values are derived from children
 * - Group child resources: Changing them affects parent (cascading)
 *
 * This test verifies simple effect math: before - costs + gains = after.
 * Resources with cascading effects would break this invariant.
 */
function getSimpleResourceIds(): string[] {
	const contentCatalog = buildResourceCatalog();
	const runtimeCatalog = createRuntimeResourceCatalog(contentCatalog);
	const indexes = getCatalogIndexes(runtimeCatalog);
	const parentIds = new Set(Object.keys(indexes.parentById));

	// Exclude resources with globalCost (reserved as action costs)
	const globalCostIds = new Set<string>();
	for (const resource of Object.values(indexes.resourceById)) {
		if (resource.globalCost) {
			globalCostIds.add(resource.id);
		}
	}

	// Also exclude resources that are in a group (have cascading effects)
	const groupChildIds = new Set<string>();
	for (const resource of Object.values(indexes.resourceById)) {
		if (resource.groupId) {
			groupChildIds.add(resource.id);
		}
	}

	return Object.values(CResource).filter(
		(id) =>
			!globalCostIds.has(id) && !parentIds.has(id) && !groupChildIds.has(id),
	);
}

const resourceKeys = getSimpleResourceIds();
const resourceKeyArb = fc.constantFrom(...resourceKeys);
const resourceMapArb = fc.dictionary(
	resourceKeyArb,
	fc.integer({ min: 1, max: 5 }),
);

function toResourceEffects(map: Record<string, number>) {
	return Object.entries(map).map(([resourceId, amount]) => ({
		type: 'resource' as const,
		method: 'add' as const,
		params: resourceAmountParams({ resourceId, amount }),
	}));
}

describe('engine property invariants', () => {
	it('pays costs, executes triggers, keeps resources non-negative and preserves snapshots', () => {
		fc.assert(
			fc.property(
				resourceMapArb, // action base costs
				resourceMapArb, // building costs
				resourceMapArb, // onBuild gains
				(baseCosts, buildingCosts, gains) => {
					const content = createContentFactory();
					const building = content.building({
						costs: buildingCosts,
						onBuild: toResourceEffects(gains),
					});
					const action = content.action({
						baseCosts,
						effects: [
							{ type: 'building', method: 'add', params: { id: building.id } },
						],
					});
					const engineContext = createTestEngine(content);
					toMain(engineContext);
					const costs = getActionCosts(action.id, engineContext, {
						id: building.id,
					});
					// PlayerState uses resourceValues for all resources
					for (const [key, amount] of Object.entries(costs)) {
						engineContext.activePlayer.resourceValues[key] = amount;
					}
					const before = snapshotPlayer(
						engineContext.activePlayer,
						engineContext,
					);
					const beforeCopy = JSON.parse(JSON.stringify(before));
					performAction(action.id, engineContext, { id: building.id });
					expect(engineContext.activePlayer.buildings.has(building.id)).toBe(
						true,
					);
					for (const key of Object.keys(
						engineContext.activePlayer.resourceValues,
					)) {
						expect(
							engineContext.activePlayer.resourceValues[key],
						).toBeGreaterThanOrEqual(0);
					}
					for (const key of new Set([
						...Object.keys(costs),
						...Object.keys(gains),
					])) {
						const expected =
							(before.values[key] ?? 0) - (costs[key] ?? 0) + (gains[key] ?? 0);
						expect(engineContext.activePlayer.resourceValues[key]).toBe(
							expected,
						);
					}
					expect(before).toEqual(beforeCopy);
					expect(before.buildings.includes(building.id)).toBe(false);
				},
			),
		);
	});
});
