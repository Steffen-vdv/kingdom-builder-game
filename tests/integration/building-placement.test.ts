import { describe, it, expect } from 'vitest';
import { performAction, getActionCosts } from '@kingdom-builder/engine';
import {
	createTestContext,
	getActionOutcome,
	getBuildingWithActionMods,
	getBuildActionId,
} from './fixtures';

describe('Building placement integration', () => {
	it('applies building effects to subsequent actions', () => {
		const engineContext = createTestContext();
		const { buildingId, actionId } = getBuildingWithActionMods();
		const buildActionId = getBuildActionId(engineContext, buildingId);
		const expandBefore = getActionOutcome(actionId, engineContext);
		const buildCosts = getActionCosts(buildActionId, engineContext, {
			id: buildingId,
		});
		for (const [key, cost] of Object.entries(buildCosts)) {
			engineContext.activePlayer.resources[key] =
				(engineContext.activePlayer.resources[key] || 0) + (cost ?? 0);
		}
		const apKey = Object.keys(buildCosts)[0];
		engineContext.activePlayer.resources[apKey] +=
			expandBefore.costs[apKey] ?? 0;
		const resBefore = { ...engineContext.activePlayer.resources };

		performAction(buildActionId, engineContext, { id: buildingId });

		expect(engineContext.activePlayer.buildings.has(buildingId)).toBe(true);
		for (const [key, cost] of Object.entries(buildCosts)) {
			expect(engineContext.activePlayer.resources[key]).toBe(
				resBefore[key] - cost,
			);
		}

		const expandAfter = getActionOutcome(actionId, engineContext);
		expect(expandAfter).not.toEqual(expandBefore);

		const resPre = { ...engineContext.activePlayer.resources };
		const v2Pre = { ...engineContext.activePlayer.resourceValues };
		const statsPre = { ...engineContext.activePlayer.stats };
		const landPre = engineContext.activePlayer.lands.length;

		performAction(actionId, engineContext);

		for (const [key, cost] of Object.entries(expandAfter.costs)) {
			const gain = expandAfter.results.resources[key] || 0;
			const resourceId = engineContext.activePlayer.getResourceV2Id(key);
			const v2Gain = expandAfter.results.valuesV2[resourceId] || 0;
			expect(v2Gain).toBe(gain);
			expect(engineContext.activePlayer.resources[key]).toBe(
				resPre[key] - cost + gain,
			);
			expect(engineContext.activePlayer.resourceValues[resourceId]).toBe(
				(v2Pre[resourceId] ?? 0) - cost + v2Gain,
			);
		}
		for (const [key, gain] of Object.entries(expandAfter.results.resources)) {
			if (expandAfter.costs[key] === undefined) {
				const resourceId = engineContext.activePlayer.getResourceV2Id(key);
				const v2Gain = expandAfter.results.valuesV2[resourceId] ?? 0;
				expect(v2Gain).toBe(gain);
				expect(engineContext.activePlayer.resources[key]).toBe(
					resPre[key] + gain,
				);
				expect(engineContext.activePlayer.resourceValues[resourceId]).toBe(
					(v2Pre[resourceId] ?? 0) + v2Gain,
				);
			}
		}
		expect(engineContext.activePlayer.lands.length).toBe(
			landPre + expandAfter.results.land,
		);
		for (const [key, gain] of Object.entries(expandAfter.results.stats)) {
			expect(engineContext.activePlayer.stats[key]).toBe(statsPre[key] + gain);
		}
	});
});
