import { describe, it, expect } from 'vitest';
import { performAction, advance } from '../src';
import { Resource as CResource, PhaseId } from '@kingdom-builder/contents';
import { createContentFactory } from '@kingdom-builder/testing';
import { createTestEngine } from './helpers';

function toMain(context: ReturnType<typeof createTestEngine>) {
	while (context.game.currentPhase !== PhaseId.Main) {
		advance(context);
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
		const context = createTestEngine(content);
		toMain(context);
		context.opponent.resources[CResource.gold] = 0;
		context.opponent.resources[CResource.happiness] = 0;
		const beforeAttacker = context.activePlayer.resources[CResource.gold] ?? 0;
		const beforeDefender = context.opponent.resources[CResource.gold] ?? 0;
		const attackerHappiness =
			context.activePlayer.resources[CResource.happiness] ?? 0;
		const defenderHappiness =
			context.opponent.resources[CResource.happiness] ?? 0;
		expect(() => performAction(action.id, context)).not.toThrow();
		expect(context.activePlayer.resources[CResource.gold]).toBe(beforeAttacker);
		expect(context.opponent.resources[CResource.gold]).toBe(beforeDefender);
		expect(context.activePlayer.resources[CResource.happiness]).toBe(
			attackerHappiness,
		);
		expect(context.opponent.resources[CResource.happiness]).toBe(
			defenderHappiness,
		);
	});
});
