import { describe, it, expect } from 'vitest';
import { getActionCosts, advance } from '../../src';
import { runEffects } from '../../src/effects/index.ts';
import { createTestEngine } from '../helpers.ts';
import { createContentFactory } from '@kingdom-builder/testing';
import { Resource as CResource, PhaseId } from '@kingdom-builder/contents';

describe('cost_mod owner scope', () => {
	it('applies only to the player who added the modifier', () => {
		const content = createContentFactory();
		const actA = content.action({ baseCosts: { [CResource.gold]: 1 } });
		const actB = content.action({ baseCosts: { [CResource.gold]: 1 } });
		const ctx = createTestEngine(content);
		while (ctx.game.currentPhase !== PhaseId.Main) {
			advance(ctx);
		}
		ctx.game.currentPlayerIndex = 0;
		runEffects(
			[
				{
					type: 'cost_mod',
					method: 'add',
					params: { id: 'general', key: CResource.gold, amount: 1 },
				},
				{
					type: 'cost_mod',
					method: 'add',
					params: {
						id: 'specific',
						actionId: actA.id,
						key: CResource.gold,
						amount: 2,
					},
				},
			],
			ctx,
		);
		const baseA = actA.baseCosts[CResource.gold] ?? 0;
		const baseB = actB.baseCosts[CResource.gold] ?? 0;
		const costAA = getActionCosts(actA.id, ctx)[CResource.gold] ?? 0;
		const costBA = getActionCosts(actB.id, ctx)[CResource.gold] ?? 0;
		expect(costAA).toBe(baseA + 3);
		expect(costBA).toBe(baseB + 1);
		ctx.game.currentPlayerIndex = 1;
		const costAB = getActionCosts(actA.id, ctx)[CResource.gold] ?? 0;
		const costBB = getActionCosts(actB.id, ctx)[CResource.gold] ?? 0;
		expect(costAB).toBe(baseA);
		expect(costBB).toBe(baseB);
	});
});
