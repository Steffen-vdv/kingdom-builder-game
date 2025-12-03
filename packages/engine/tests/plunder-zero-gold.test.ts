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
		// PlayerState uses resourceValues for all resources
		context.opponent.resourceValues[CResource.gold] = 0;
		const beforeAttacker =
			context.activePlayer.resourceValues[CResource.gold] ?? 0;
		const beforeDefender = context.opponent.resourceValues[CResource.gold] ?? 0;
		expect(() => performAction(action.id, context)).not.toThrow();
		expect(context.activePlayer.resourceValues[CResource.gold]).toBe(
			beforeAttacker,
		);
		expect(context.opponent.resourceValues[CResource.gold]).toBe(beforeDefender);
	});
});
