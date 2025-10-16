import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { Resource as CResource, PhaseId } from '@kingdom-builder/contents';
import { createTestEngine } from './helpers';
import { createContentFactory } from '@kingdom-builder/testing';
import { advance, performAction, getActionCosts, snapshotPlayer } from '../src';

function toMain(engineContext: ReturnType<typeof createTestEngine>) {
	while (engineContext.game.currentPhase !== PhaseId.Main) {
		advance(engineContext);
	}
}

const resourceKeys = Object.values(CResource);
const resourceKeyArb = fc.constantFrom(...resourceKeys);
const resourceMapArb = fc.dictionary(
	resourceKeyArb,
	fc.integer({ min: 1, max: 5 }),
);

function toResourceEffects(map: Record<string, number>) {
	return Object.entries(map).map(([key, amount]) => ({
		type: 'resource' as const,
		method: 'add' as const,
		params: { key, amount },
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
					for (const [key, amount] of Object.entries(costs)) {
						engineContext.activePlayer.resources[key] = amount;
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
					for (const key of Object.keys(engineContext.activePlayer.resources)) {
						expect(
							engineContext.activePlayer.resources[key],
						).toBeGreaterThanOrEqual(0);
					}
					for (const key of new Set([
						...Object.keys(costs),
						...Object.keys(gains),
					])) {
						const expected =
							(before.resources[key] ?? 0) -
							(costs[key] ?? 0) +
							(gains[key] ?? 0);
						expect(engineContext.activePlayer.resources[key]).toBe(expected);
					}
					expect(before).toEqual(beforeCopy);
					expect(before.buildings.includes(building.id)).toBe(false);
				},
			),
		);
	});
});
