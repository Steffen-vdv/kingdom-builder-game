import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { Resource as CResource, PhaseId } from '@kingdom-builder/contents';
import { createTestEngine } from './helpers';
import { createContentFactory } from './factories/content';
import { advance, performAction, getActionCosts, snapshotPlayer } from '../src';

function toMain(ctx: ReturnType<typeof createTestEngine>) {
	while (ctx.game.currentPhase !== PhaseId.Main) {
		advance(ctx);
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
					const ctx = createTestEngine(content);
					toMain(ctx);
					const costs = getActionCosts(action.id, ctx, { id: building.id });
					for (const [key, amount] of Object.entries(costs)) {
						ctx.activePlayer.resources[key] = amount;
					}
					const before = snapshotPlayer(ctx.activePlayer, ctx);
					const beforeCopy = JSON.parse(JSON.stringify(before));
					performAction(action.id, ctx, { id: building.id });
					expect(ctx.activePlayer.buildings.has(building.id)).toBe(true);
					for (const key of Object.keys(ctx.activePlayer.resources)) {
						expect(ctx.activePlayer.resources[key]).toBeGreaterThanOrEqual(0);
					}
					for (const key of new Set([
						...Object.keys(costs),
						...Object.keys(gains),
					])) {
						const expected =
							(before.resources[key] ?? 0) -
							(costs[key] ?? 0) +
							(gains[key] ?? 0);
						expect(ctx.activePlayer.resources[key]).toBe(expected);
					}
					expect(before).toEqual(beforeCopy);
					expect(before.buildings.includes(building.id)).toBe(false);
				},
			),
		);
	});
});
