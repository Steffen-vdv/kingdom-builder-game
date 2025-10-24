import { describe, it, expect, vi } from 'vitest';
import { createContentFactory } from '@kingdom-builder/testing';
import { Resource as CResource } from '@kingdom-builder/contents';
import {
	applyCostsWithPassives,
	getActionCosts,
	verifyCostAffordability,
	deductCostsFromPlayer,
} from '../../src/actions/costs.ts';
import type { PlayerId } from '../../src/state/index.ts';
import { createTestEngine } from '../helpers.ts';

describe('action cost helpers', () => {
	it('applies default AP cost only for non-system actions', () => {
		const content = createContentFactory();
		const standardAction = content.action({ baseCosts: {} });
		const systemAction = content.action({ baseCosts: {}, system: true });
		const engineContext = createTestEngine({ actions: content.actions });
		const apKey = engineContext.actionCostResource;

		const standardCosts = applyCostsWithPassives(
			standardAction.id,
			{},
			engineContext,
		);
		const systemCosts = applyCostsWithPassives(
			systemAction.id,
			{},
			engineContext,
		);

		expect(standardCosts[apKey]).toBe(
			engineContext.services.rules.defaultActionAPCost,
		);
		expect(systemCosts[apKey]).toBe(0);
	});

	it('resolves costs for alternate players without mutating state', () => {
		const content = createContentFactory();
		const action = content.action({
			baseCosts: { [CResource.gold]: 2 },
		});
		const engineContext = createTestEngine({ actions: content.actions });
		const originalIndex = engineContext.game.currentPlayerIndex;
		const otherPlayerId = engineContext.opponent.id;

		const activeCosts = getActionCosts(action.id, engineContext);
		const samePlayerCosts = getActionCosts(
			action.id,
			engineContext,
			undefined,
			engineContext.activePlayer.id,
		);
		const swappedCosts = getActionCosts(
			action.id,
			engineContext,
			undefined,
			otherPlayerId,
		);
		const unknownCosts = getActionCosts(
			action.id,
			engineContext,
			undefined,
			'missing' as PlayerId,
		);

		expect(engineContext.game.currentPlayerIndex).toBe(originalIndex);
		expect(activeCosts).toEqual(samePlayerCosts);
		expect(swappedCosts).toEqual(activeCosts);
		expect(unknownCosts).toEqual(activeCosts);
	});

	it('validates affordability and deducts resources with notifications', () => {
		const engineContext = createTestEngine();
		const player = engineContext.activePlayer;
		const goldId = player.getResourceV2Id(CResource.gold);
		player.resourceValues[goldId] = 1;
		const costs = { [CResource.gold]: 3 };

		const result = verifyCostAffordability(costs, player);
		expect(result).toContain('Insufficient');

		player.resourceValues[goldId] = 5;
		const handler = vi.spyOn(engineContext.services, 'handleResourceChange');
		deductCostsFromPlayer(costs, player, engineContext);
		expect(player.resourceValues[goldId]).toBe(2);
		expect(handler).toHaveBeenCalledWith(engineContext, player, goldId);
	});
});
