import { describe, it, expect } from 'vitest';
import { getActionCosts, advance } from '../../src';
import { runEffects } from '../../src/effects/index.ts';
import { createTestEngine } from '../helpers.ts';
import { createContentFactory } from '@kingdom-builder/testing';
import { Resource as CResource, PhaseId } from '@kingdom-builder/contents';

describe('cost_mod owner scope', () => {
	it('applies only to the player who added the modifier', () => {
		const content = createContentFactory();
		const firstActionDefinition = content.action({
			baseCosts: { [CResource.gold]: 1 },
		});
		const secondActionDefinition = content.action({
			baseCosts: { [CResource.gold]: 1 },
		});
		const engineContext = createTestEngine(content);
		while (engineContext.game.currentPhase !== PhaseId.Main) {
			advance(engineContext);
		}
		engineContext.game.currentPlayerIndex = 0;
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
						actionId: firstActionDefinition.id,
						key: CResource.gold,
						amount: 2,
					},
				},
			],
			engineContext,
		);
		const firstActionBaseCost =
			firstActionDefinition.baseCosts[CResource.gold] ?? 0;
		const secondActionBaseCost =
			secondActionDefinition.baseCosts[CResource.gold] ?? 0;
		const firstPlayerFirstActionCost =
			getActionCosts(firstActionDefinition.id, engineContext)[CResource.gold] ??
			0;
		const firstPlayerSecondActionCost =
			getActionCosts(secondActionDefinition.id, engineContext)[
				CResource.gold
			] ?? 0;
		expect(firstPlayerFirstActionCost).toBe(firstActionBaseCost + 3);
		expect(firstPlayerSecondActionCost).toBe(secondActionBaseCost + 1);
		engineContext.game.currentPlayerIndex = 1;
		const secondPlayerFirstActionCost =
			getActionCosts(firstActionDefinition.id, engineContext)[CResource.gold] ??
			0;
		const secondPlayerSecondActionCost =
			getActionCosts(secondActionDefinition.id, engineContext)[
				CResource.gold
			] ?? 0;
		expect(secondPlayerFirstActionCost).toBe(firstActionBaseCost);
		expect(secondPlayerSecondActionCost).toBe(secondActionBaseCost);
	});
});
