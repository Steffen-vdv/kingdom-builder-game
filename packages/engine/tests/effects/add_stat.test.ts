import { describe, it, expect } from 'vitest';
import { performAction, advance, getActionCosts } from '../../src/index.ts';
import { Resource as CResource } from '@boardsmith/contents';
import { createTestEngine } from '../helpers.ts';
import { createContentFactory } from '@boardsmith/testing';
import {
	resourceAmountParams,
	type ResourceAmountParamsResult,
} from '../helpers/resourceParams.ts';

// Helper to get effects from first tier
function getEffectsFromFirstTier(action: {
	tiers: Record<string, { effects: unknown[] }>;
}): unknown[] {
	const tierKeys = Object.keys(action.tiers);
	const firstTier = tierKeys.length > 0 ? tierKeys[0] : '1';
	return action.tiers[firstTier!]?.effects ?? [];
}

describe('resource:add effect for stats', () => {
	it('increments a stat via action effect', () => {
		const content = createContentFactory({ isolated: true });
		const trainArmy = content.action({
			id: 'train_army',
			name: 'Train Army',
			tiers: {
				'1': {
					effects: [
						{
							type: 'resource',
							method: 'add',
							params: resourceAmountParams({
								resourceId: CResource.armyStrength,
								amount: 3,
							}),
						},
					],
				},
			},
		});
		const engineContext = createTestEngine(content);
		advance(engineContext);
		engineContext.game.currentPlayerIndex = 0;
		const armyStrengthBefore =
			engineContext.activePlayer.resourceValues[CResource.armyStrength] ?? 0;
		const effects = getEffectsFromFirstTier(trainArmy);
		const params = (
			effects.find(
				(effect) =>
					(effect as { type?: string }).type === 'resource' &&
					(effect as { method?: string }).method === 'add' &&
					(effect as { params?: { resourceId?: string } }).params
						?.resourceId === CResource.armyStrength,
			) as { params?: ResourceAmountParamsResult }
		)?.params;
		const armyStrengthIncrease = params?.amount ?? 0;
		const actionCosts = getActionCosts('train_army', engineContext);
		engineContext.activePlayer.resourceValues[CResource.cp] =
			actionCosts[CResource.cp] ?? 0;
		performAction('train_army', engineContext);
		expect(
			engineContext.activePlayer.resourceValues[CResource.armyStrength],
		).toBe(armyStrengthBefore + armyStrengthIncrease);
	});
});
