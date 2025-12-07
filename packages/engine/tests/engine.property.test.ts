import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { Resource as CResource, PhaseId } from '@kingdom-builder/contents';
import { createTestEngine } from './helpers';
import { createContentFactory } from '@kingdom-builder/testing';
import { advance, performAction, getActionCosts, snapshotPlayer } from '../src';
import { resourceAmountParams } from './helpers/resourceParams';

function toMain(engineContext: ReturnType<typeof createTestEngine>) {
	while (engineContext.game.currentPhase !== PhaseId.Main) {
		advance(engineContext);
	}
}

// Filter out AP since it's the global action cost and can't be overridden
const resourceKeys = Object.values(CResource).filter(
	(key) => key !== CResource.ap,
);
const resourceKeyArb = fc.constantFrom(...resourceKeys);
const resourceMapArb = fc.dictionary(
	resourceKeyArb,
	fc.integer({ min: 1, max: 5 }),
);

function toResourceEffects(map: Record<string, number>) {
	return Object.entries(map).map(([key, amount]) => ({
		type: 'resource' as const,
		method: 'add' as const,
		params: resourceAmountParams({ key, amount }),
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
