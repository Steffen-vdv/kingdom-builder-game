import { describe, it, expect } from 'vitest';
import { performAction, getActionCosts } from '@kingdom-builder/engine';
import type { ResourceKey } from '@kingdom-builder/contents';
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
			player.resources[key] = (player.resources[key] || 0) + (cost ?? 0);
		}
		const apKey = Object.keys(buildCosts)[0];
		player.resources[apKey] += expandBefore.costs[apKey] ?? 0;
		const resBefore = { ...player.resourceValues };

		performAction(buildActionId, engineContext, { id: buildingId });

		expect(player.buildings.has(buildingId)).toBe(true);
		for (const [key, cost] of Object.entries(buildCosts)) {
			const resourceId = player.getResourceV2Id(key as ResourceKey);
			expect(player.resourceValues[resourceId]).toBe(
				(resBefore[resourceId] ?? 0) - (cost ?? 0),
			);
		}

		const expandAfter = getActionOutcome(actionId, engineContext);
		expect(expandAfter).not.toEqual(expandBefore);

		const resPre = { ...player.resourceValues };
		const landPre = player.lands.length;
		const actionCostResourceIds = new Set(
			Object.keys(expandAfter.costs).map((key) =>
				player.getResourceV2Id(key as ResourceKey),
			),
		);

		performAction(actionId, engineContext);

		for (const [key, cost] of Object.entries(expandAfter.costs)) {
			const resourceId = player.getResourceV2Id(key as ResourceKey);
			const gain = expandAfter.results.valuesV2[resourceId] ?? 0;
			expect(player.resourceValues[resourceId]).toBe(
				(resPre[resourceId] ?? 0) - (cost ?? 0) + gain,
			);
		}
		for (const [resourceId, gain] of Object.entries(
			expandAfter.results.valuesV2,
		)) {
			if (actionCostResourceIds.has(resourceId)) {
				continue;
			}
			expect(player.resourceValues[resourceId]).toBe(
				(resPre[resourceId] ?? 0) + gain,
			);
		}
		expect(player.lands.length).toBe(landPre + expandAfter.results.land);
	});
});
