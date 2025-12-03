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
		const player = engineContext.activePlayer;
		for (const [key, cost] of Object.entries(buildCosts)) {
			const resourceId = player.getResourceV2Id(key);
			player.resourceValues[resourceId] =
				(player.resourceValues[resourceId] || 0) + (cost ?? 0);
		}
		const apKey = Object.keys(buildCosts)[0]!;
		const apResourceId = player.getResourceV2Id(apKey);
		player.resourceValues[apResourceId] += expandBefore.costs[apKey] ?? 0;
		const v2Before = { ...player.resourceValues };

		performAction(buildActionId, engineContext, { id: buildingId });

		expect(player.buildings.has(buildingId)).toBe(true);
		for (const [key, cost] of Object.entries(buildCosts)) {
			const resourceId = player.getResourceV2Id(key);
			expect(player.resourceValues[resourceId]).toBe(
				(v2Before[resourceId] ?? 0) - cost,
			);
		}

		const expandAfter = getActionOutcome(actionId, engineContext);
		expect(expandAfter).not.toEqual(expandBefore);

		const v2Pre = { ...player.resourceValues };
		const statsPre = { ...player.stats };
		const landPre = engineContext.activePlayer.lands.length;

		performAction(actionId, engineContext);

		for (const [key, cost] of Object.entries(expandAfter.costs)) {
			const resourceId = engineContext.activePlayer.getResourceV2Id(key);
			const v2Gain = expandAfter.results.valuesV2[resourceId] || 0;
			expect(engineContext.activePlayer.resourceValues[resourceId]).toBe(
				(v2Pre[resourceId] ?? 0) - cost + v2Gain,
			);
		}
		for (const [key, gain] of Object.entries(expandAfter.results.resources)) {
			if (expandAfter.costs[key] === undefined) {
				const resourceId = engineContext.activePlayer.getResourceV2Id(key);
				const v2Gain = expandAfter.results.valuesV2[resourceId] ?? 0;
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
