import { describe, it, expect } from 'vitest';
import {
	performAction,
	runEffects,
	getActionCosts,
} from '@kingdom-builder/engine';
import {
	createTestContext,
	getBuildingWithResourceBonuses,
	getBuildActionId,
} from './fixtures';

describe('Building resource bonuses', () => {
	it('applies and removes resource bonuses when built and removed', () => {
		const { buildingId, resources } = getBuildingWithResourceBonuses();
		const engineContext = createTestContext();
		const buildActionId = getBuildActionId(engineContext, buildingId);
		const buildCosts = getActionCosts(buildActionId, engineContext, {
			id: buildingId,
		});
		for (const [key, cost] of Object.entries(buildCosts)) {
			engineContext.activePlayer.resourceValues[key] = cost ?? 0;
		}
		const before: Record<string, number> = {};
		for (const r of resources) {
			before[r.key] = engineContext.activePlayer.resourceValues[r.key] ?? 0;
		}

		performAction(buildActionId, engineContext, { id: buildingId });

		expect(engineContext.activePlayer.buildings.has(buildingId)).toBe(true);
		for (const r of resources) {
			expect(engineContext.activePlayer.resourceValues[r.key]).toBeCloseTo(
				before[r.key] + r.amount,
			);
		}

		runEffects(
			[{ type: 'building', method: 'remove', params: { id: buildingId } }],
			engineContext,
		);

		expect(engineContext.activePlayer.buildings.has(buildingId)).toBe(false);
		for (const r of resources) {
			expect(engineContext.activePlayer.resourceValues[r.key]).toBeCloseTo(
				before[r.key],
			);
		}

		runEffects(
			[{ type: 'building', method: 'remove', params: { id: buildingId } }],
			engineContext,
		);

		expect(engineContext.activePlayer.buildings.has(buildingId)).toBe(false);
		for (const r of resources) {
			expect(engineContext.activePlayer.resourceValues[r.key]).toBeCloseTo(
				before[r.key],
			);
		}
	});
});
