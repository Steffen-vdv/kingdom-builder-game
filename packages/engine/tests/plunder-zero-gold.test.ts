import { describe, it, expect } from 'vitest';
import { performAction, advance, getActionCosts } from '../src';
import { Resource as CResource, PhaseId } from '@kingdom-builder/contents';
import { createContentFactory } from '@kingdom-builder/testing';
import { createTestEngine } from './helpers';

function toMain(context: ReturnType<typeof createTestEngine>) {
	while (context.game.currentPhase !== PhaseId.Main) {
		advance(context);
	}
}

function grantAP(context: ReturnType<typeof createTestEngine>, actionId: string) {
	const costs = getActionCosts(actionId, context);
	for (const [key, amount] of Object.entries(costs)) {
		context.activePlayer.resourceValues[key] = amount;
	}
}

describe('plunder action with zero opponent resource', () => {
	it("doesn't modify resources when opponent has none", () => {
		const content = createContentFactory();
		const transferAmount = 5; // Transfer 5 gold from opponent to active player
		const action = content.action({
			effects: [
				{
					type: 'resource',
					method: 'transfer',
					params: {
						donor: {
							player: 'opponent',
							resourceId: CResource.gold,
							change: { type: 'amount', amount: -transferAmount },
						},
						recipient: {
							player: 'active',
							resourceId: CResource.gold,
							change: { type: 'amount', amount: transferAmount },
						},
					},
				},
			],
		});
		const context = createTestEngine(content);
		toMain(context);
		grantAP(context, action.id);
		// PlayerState uses resourceValues for all resources
		context.opponent.resourceValues[CResource.gold] = 0;
		const beforeAttacker =
			context.activePlayer.resourceValues[CResource.gold] ?? 0;
		const beforeDefender = context.opponent.resourceValues[CResource.gold] ?? 0;
		expect(() => performAction(action.id, context)).not.toThrow();
		expect(context.activePlayer.resourceValues[CResource.gold]).toBe(
			beforeAttacker,
		);
		expect(context.opponent.resourceValues[CResource.gold]).toBe(
			beforeDefender,
		);
	});
});
