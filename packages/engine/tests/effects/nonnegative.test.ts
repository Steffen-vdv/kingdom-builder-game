import { describe, it, expect } from 'vitest';
import {
	performAction,
	advance,
	getActionCosts,
	getResourceValue,
} from '../../src/index.ts';
import { Resource as CResource } from '@kingdom-builder/contents';
import { createTestEngine } from '../helpers.ts';
import { createContentFactory } from '@kingdom-builder/testing';
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

describe('resource and stat bounds', () => {
	it('clamps stat removal to zero', () => {
		const content = createContentFactory({ isolated: true });
		const lowerFort = content.action({
			id: 'lower_fort',
			name: 'Lower Fort',
			tiers: {
				'1': {
					effects: [
						{
							type: 'resource',
							method: 'remove',
							params: resourceAmountParams({
								resourceId: CResource.fortificationStrength,
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
		const effects = getEffectsFromFirstTier(lowerFort);
		const resourceParams = (
			effects.find(
				(effect) => (effect as { type?: string }).type === 'resource',
			) as { params?: ResourceAmountParamsResult }
		)?.params;
		const effectAmount = resourceParams?.amount ?? 0;
		engineContext.activePlayer.resourceValues[CResource.fortificationStrength] =
			effectAmount - 1;
		const cost = getActionCosts('lower_fort', engineContext)[CResource.cp] ?? 0;
		engineContext.activePlayer.resourceValues[CResource.cp] = cost;
		performAction('lower_fort', engineContext);
		expect(
			getResourceValue(
				engineContext.activePlayer,
				CResource.fortificationStrength,
			),
		).toBe(0);
	});

	it('clamps resource additions to zero', () => {
		const content = createContentFactory({ isolated: true });
		const loseGold = content.action({
			id: 'lose_gold',
			name: 'Lose Gold',
			tiers: {
				'1': {
					effects: [
						{
							type: 'resource',
							method: 'add',
							params: resourceAmountParams({
								resourceId: CResource.gold,
								amount: -5,
							}),
						},
					],
				},
			},
		});
		const engineContext = createTestEngine(content);
		advance(engineContext);
		engineContext.game.currentPlayerIndex = 0;
		const effects = getEffectsFromFirstTier(loseGold);
		const resourceParams = (
			effects.find(
				(effect) => (effect as { type?: string }).type === 'resource',
			) as { params?: ResourceAmountParamsResult }
		)?.params;
		const effectAmount = resourceParams?.amount ?? 0;
		engineContext.activePlayer.resourceValues[CResource.gold] = 1;
		const cost = getActionCosts('lose_gold', engineContext)[CResource.cp] ?? 0;
		engineContext.activePlayer.resourceValues[CResource.cp] = cost;
		performAction('lose_gold', engineContext);
		expect(getResourceValue(engineContext.activePlayer, CResource.gold)).toBe(
			Math.max(1 + effectAmount, 0),
		);
	});

	it('clamps negative stat additions to zero', () => {
		const content = createContentFactory({ isolated: true });
		const badAdd = content.action({
			id: 'bad_add',
			name: 'Bad Add',
			tiers: {
				'1': {
					effects: [
						{
							type: 'resource',
							method: 'add',
							params: resourceAmountParams({
								resourceId: CResource.armyStrength,
								amount: -4,
							}),
						},
					],
				},
			},
		});
		const engineContext = createTestEngine(content);
		advance(engineContext);
		engineContext.game.currentPlayerIndex = 0;
		const effects = getEffectsFromFirstTier(badAdd);
		const addParams = (
			effects.find(
				(effect) => (effect as { type?: string }).type === 'resource',
			) as { params?: ResourceAmountParamsResult }
		)?.params;
		const effectAmount = addParams?.amount ?? 0;
		const before = getResourceValue(
			engineContext.activePlayer,
			CResource.armyStrength,
		);
		const cost = getActionCosts('bad_add', engineContext)[CResource.cp] ?? 0;
		engineContext.activePlayer.resourceValues[CResource.cp] = cost;
		performAction('bad_add', engineContext);
		expect(
			getResourceValue(engineContext.activePlayer, CResource.armyStrength),
		).toBe(Math.max(before + effectAmount, 0));
	});
});
