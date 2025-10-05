import { describe, it, expect } from 'vitest';
import { performAction, advance } from '../src';
import { Resource as CResource, PhaseId } from '@kingdom-builder/contents';
import { createContentFactory } from './factories/content';
import { createTestEngine } from './helpers';

function toMain(ctx: ReturnType<typeof createTestEngine>) {
	while (ctx.game.currentPhase !== PhaseId.Main) {
		advance(ctx);
	}
}

describe('plunder action with zero opponent resource', () => {
	it("doesn't modify resources when opponent has none", () => {
		const content = createContentFactory();
		const action = content.action({
			baseCosts: { [CResource.ap]: 0 },
			effects: [
				{
					type: 'resource',
					method: 'transfer',
					params: { key: CResource.gold },
				},
			],
		});
		const ctx = createTestEngine(content);
		toMain(ctx);
		ctx.opponent.resources[CResource.gold] = 0;
		const beforeAttacker = ctx.activePlayer.resources[CResource.gold] ?? 0;
		const beforeDefender = ctx.opponent.resources[CResource.gold] ?? 0;
		expect(() => performAction(action.id, ctx)).not.toThrow();
		expect(ctx.activePlayer.resources[CResource.gold]).toBe(beforeAttacker);
		expect(ctx.opponent.resources[CResource.gold]).toBe(beforeDefender);
	});
});
