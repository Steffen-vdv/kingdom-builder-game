import { describe, it, expect } from 'vitest';
import { performAction, getActionCosts, advance } from '../../src';
import { Resource as CResource, PhaseId } from '@kingdom-builder/contents';
import { createTestEngine } from '../helpers';
import { createContentFactory } from '../factories/content';

describe('development:add effect', () => {
	it('adds development and applies onBuild effects', () => {
		const content = createContentFactory();
		const development = content.development({
			onBuild: [
				{
					type: 'resource',
					method: 'add',
					params: { key: CResource.gold, amount: 2 },
				},
			],
		});
		const action = content.action({
			baseCosts: { [CResource.ap]: 1 },
			effects: [
				{
					type: 'development',
					method: 'add',
					params: { id: development.id, landId: '$landId' },
				},
			],
		});
		const ctx = createTestEngine(content);
		while (ctx.game.currentPhase !== PhaseId.Main) {
			advance(ctx);
		}
		const land = ctx.activePlayer.lands.find((l) => l.slotsUsed < l.slotsMax)!;
		const cost = getActionCosts(action.id, ctx, {
			id: development.id,
			landId: land.id,
		});
		ctx.activePlayer.ap = cost[CResource.ap] ?? 0;
		const beforeGold = ctx.activePlayer.gold;
		const beforeSlots = land.slotsUsed;
		const gain = development.onBuild?.find(
			(e) => e.type === 'resource' && e.method === 'add',
		)?.params?.['amount'] as number;
		performAction(action.id, ctx, { id: development.id, landId: land.id });
		expect(land.developments).toContain(development.id);
		expect(land.slotsUsed).toBe(beforeSlots + 1);
		expect(ctx.activePlayer.gold).toBe(beforeGold + gain);
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
		const ctx = createTestEngine(content);
		while (ctx.game.currentPhase !== PhaseId.Main) {
			advance(ctx);
		}
		expect(() => performAction(action.id, ctx)).toThrow(
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
		const ctx = createTestEngine(content);
		while (ctx.game.currentPhase !== PhaseId.Main) {
			advance(ctx);
		}
		const land = ctx.activePlayer.lands[0];
		land.slotsUsed = land.slotsMax;
		expect(() =>
			performAction(action.id, ctx, { id: development.id, landId: land.id }),
		).toThrow(new RegExp(`No free slots on land ${land.id}`));
	});
});
