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
		const buildCosts = getActionCosts(buildActionId, engineContext);
		for (const [key, cost] of Object.entries(buildCosts)) {
			engineContext.activePlayer.resources[key] = cost ?? 0;
		}
		const before: Record<string, number> = {};
		for (const s of stats) {
			before[s.key] = engineContext.activePlayer.stats[s.key];
		}

		performAction(buildActionId, engineContext);

		expect(engineContext.activePlayer.buildings.has(buildingId)).toBe(true);
		for (const s of stats) {
			expect(engineContext.activePlayer.stats[s.key]).toBeCloseTo(
				before[s.key] + s.amount,
			);
		}

		runEffects(
			[{ type: 'building', method: 'remove', params: { id: buildingId } }],
			engineContext,
		);

		expect(engineContext.activePlayer.buildings.has(buildingId)).toBe(false);
		for (const s of stats) {
			expect(engineContext.activePlayer.stats[s.key]).toBeCloseTo(
				before[s.key],
			);
		}

		runEffects(
			[{ type: 'building', method: 'remove', params: { id: buildingId } }],
			engineContext,
		);

		expect(engineContext.activePlayer.buildings.has(buildingId)).toBe(false);
		for (const s of stats) {
			expect(engineContext.activePlayer.stats[s.key]).toBeCloseTo(
				before[s.key],
			);
		}
	});
});
