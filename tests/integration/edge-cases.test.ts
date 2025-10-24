import { describe, it, expect } from 'vitest';
import { performAction } from '@kingdom-builder/engine';
import type { ResourceKey } from '@kingdom-builder/contents';
import {
	createTestContext,
	getActionWithMultipleCosts,
	getActionWithCost,
} from './fixtures';

describe('Action edge cases', () => {
	it('throws for unknown action', () => {
		const engineContext = createTestContext();
		expect(() => performAction('not_real', engineContext)).toThrow(
			/Unknown id/,
		);
	});

	it('rejects actions when a required resource is exhausted', () => {
		const engineContext = createTestContext();
		const { actionId, costs } = getActionWithMultipleCosts(engineContext);
		const player = engineContext.activePlayer;
		for (const [key, amount] of Object.entries(costs)) {
			player.resources[key] = amount ?? 0;
		}
		const entries = Object.entries(costs);
		const resourceKey = entries[1][0];
		const amount = entries[1][1] ?? 0;
		const resourceId = player.getResourceV2Id(resourceKey as ResourceKey);
		player.resources[resourceKey] = amount - 1;
		expect(() => performAction(actionId, engineContext)).toThrow(
			new RegExp(`Insufficient ${resourceKey}`),
		);
		expect(player.resourceValues[resourceId]).toBe(amount - 1);
	});

	it('rejects actions when a primary resource is exhausted', () => {
		const engineContext = createTestContext();
		const { actionId, costs } = getActionWithCost(engineContext);
		const entries = Object.entries(costs);
		const primaryKey = entries[0][0];
		const primaryAmount = entries[0][1] ?? 0;
		for (const [key, amount] of entries.slice(1)) {
			engineContext.activePlayer.resources[key] = amount ?? 0;
		}
		const primaryResourceId = engineContext.activePlayer.getResourceV2Id(
			primaryKey as ResourceKey,
		);
		engineContext.activePlayer.resources[primaryKey] = primaryAmount - 1;
		expect(() => performAction(actionId, engineContext)).toThrow(
			new RegExp(`Insufficient ${primaryKey}`),
		);
		expect(engineContext.activePlayer.resourceValues[primaryResourceId]).toBe(
			primaryAmount - 1,
		);
	});
});
