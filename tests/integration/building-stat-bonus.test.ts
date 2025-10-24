import { describe, it, expect } from 'vitest';
import {
	performAction,
	runEffects,
	getActionCosts,
} from '@kingdom-builder/engine';
import {
	createTestContext,
	getBuildingWithStatBonuses,
	getBuildActionId,
} from './fixtures';

describe('Building stat bonuses', () => {
	it('applies and removes stat bonuses when built and removed', () => {
		const { buildingId, stats } = getBuildingWithStatBonuses();
		const engineContext = createTestContext();
		const buildActionId = getBuildActionId(engineContext, buildingId);
		const buildCosts = getActionCosts(buildActionId, engineContext, {
			id: buildingId,
		});
		const player = engineContext.activePlayer;
		for (const [key, cost] of Object.entries(buildCosts)) {
			player.resources[key] = cost ?? 0;
		}
		const before: Record<string, number> = {};
		const statResourceIds = stats.map((s) => ({
			id: player.getStatResourceV2Id(s.key),
			amount: s.amount,
			key: s.key,
		}));
		for (const { id, key } of statResourceIds) {
			before[id] = player.resourceValues[id] ?? player.stats[key];
		}

		performAction(buildActionId, engineContext, { id: buildingId });

		expect(player.buildings.has(buildingId)).toBe(true);
		for (const { id, amount } of statResourceIds) {
			expect(player.resourceValues[id]).toBeCloseTo((before[id] ?? 0) + amount);
		}

		runEffects(
			[{ type: 'building', method: 'remove', params: { id: buildingId } }],
			engineContext,
		);

		expect(player.buildings.has(buildingId)).toBe(false);
		for (const { id } of statResourceIds) {
			expect(player.resourceValues[id]).toBeCloseTo(before[id] ?? 0);
		}

		runEffects(
			[{ type: 'building', method: 'remove', params: { id: buildingId } }],
			engineContext,
		);

		expect(player.buildings.has(buildingId)).toBe(false);
		for (const { id } of statResourceIds) {
			expect(player.resourceValues[id]).toBeCloseTo(before[id] ?? 0);
		}
	});
});
