import { describe, it, expect } from 'vitest';
import { performAction, getActionCosts, advance } from '../../src';
import { Resource as CResource, PhaseId } from '@kingdom-builder/contents';
import { createTestEngine } from '../helpers';
import { createContentFactory } from '@kingdom-builder/testing';
import { resourceAmountParams } from '../helpers/resourceParams.ts';

describe('development:add effect', () => {
	it('adds development and applies onBuild effects', () => {
		const content = createContentFactory();
		const development = content.development({
			onBuild: [
				{
					type: 'resource',
					method: 'add',
					params: resourceAmountParams({
						resourceId: CResource.gold,
						amount: 2,
					}),
				},
			],
		});
		const action = content.action({
			effects: [
				{
					type: 'development',
					method: 'add',
					params: { id: development.id, landId: '$landId' },
				},
			],
		});
		const engineContext = createTestEngine(content);
		while (engineContext.game.currentPhase !== PhaseId.Main) {
			advance(engineContext);
		}
		const land = engineContext.activePlayer.lands.find(
			(land) => land.slotsUsed < land.slotsMax,
		)!;
		const cost = getActionCosts(action.id, engineContext, {
			id: development.id,
			landId: land.id,
		});
		engineContext.activePlayer.resourceValues[CResource.ap] =
			cost[CResource.ap] ?? 0;
		const beforeGold =
			engineContext.activePlayer.resourceValues[CResource.gold] ?? 0;
		const beforeSlots = land.slotsUsed;
		const gain = development.onBuild?.find(
			(e) => e.type === 'resource' && e.method === 'add',
		)?.params?.['amount'] as number;
		performAction(action.id, engineContext, {
			id: development.id,
			landId: land.id,
		});
		expect(land.developments).toContain(development.id);
		expect(land.slotsUsed).toBe(beforeSlots + 1);
		expect(engineContext.activePlayer.resourceValues[CResource.gold]).toBe(
			beforeGold + gain,
		);
	});

	it('throws if land does not exist', () => {
		const content = createContentFactory();
		const development = content.development();
		const action = content.action({
			effects: [
				{
					type: 'development',
					method: 'add',
					params: { id: development.id, landId: 'missing' },
				},
			],
		});
		const engineContext = createTestEngine(content);
		while (engineContext.game.currentPhase !== PhaseId.Main) {
			advance(engineContext);
		}
		// Give player AP to pass cost check so we can verify the land error
		const cost = getActionCosts(action.id, engineContext);
		engineContext.activePlayer.resourceValues[CResource.ap] =
			cost[CResource.ap] ?? 0;
		expect(() => performAction(action.id, engineContext)).toThrow(
			/Land missing not found/,
		);
	});

	it('throws if land has no free slots', () => {
		const content = createContentFactory();
		const development = content.development();
		const action = content.action({
			effects: [
				{
					type: 'development',
					method: 'add',
					params: { id: development.id, landId: '$landId' },
				},
			],
		});
		const engineContext = createTestEngine(content);
		while (engineContext.game.currentPhase !== PhaseId.Main) {
			advance(engineContext);
		}
		const land = engineContext.activePlayer.lands[0];
		land.slotsUsed = land.slotsMax;
		// Give player AP to pass cost check so we can verify the slots error
		const cost = getActionCosts(action.id, engineContext, {
			id: development.id,
			landId: land.id,
		});
		engineContext.activePlayer.resourceValues[CResource.ap] =
			cost[CResource.ap] ?? 0;
		expect(() =>
			performAction(action.id, engineContext, {
				id: development.id,
				landId: land.id,
			}),
		).toThrow(new RegExp(`No free slots on land ${land.id}`));
	});
});
