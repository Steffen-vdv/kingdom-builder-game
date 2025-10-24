import { describe, it, expect } from 'vitest';
import { resolveAttack } from '../src/index.ts';
import { createTestEngine } from './helpers.ts';
import { Resource } from '../src/state/index.ts';
import { ResourceV2Id } from '@kingdom-builder/contents';

const ABSORPTION_ID = ResourceV2Id.Absorption;

function ensureAbsorptionRegistered(
	engineContext: ReturnType<typeof createTestEngine>,
): string {
	const registry = engineContext.resourceV2.getRegistry();
	if (!registry) {
		throw new Error('ResourceV2 registry is not initialized.');
	}
	registry.getResource(ABSORPTION_ID);
	return ABSORPTION_ID;
}

function setAbsorption(
	engineContext: ReturnType<typeof createTestEngine>,
	player: ReturnType<typeof createTestEngine>['activePlayer'],
	value: number,
): void {
	const id = ensureAbsorptionRegistered(engineContext);
	const current = player.resourceV2.amounts[id] ?? 0;
	const delta = value - current;
	if (delta === 0) {
		return;
	}
	const originalIndex = engineContext.game.currentPlayerIndex;
	const playerIndex = engineContext.game.players.indexOf(player);
	engineContext.game.currentPlayerIndex = playerIndex;
	engineContext.resourceV2.applyValueChange(engineContext, player, id, {
		delta,
		reconciliation: 'clamp',
	});
	engineContext.game.currentPlayerIndex = originalIndex;
}

function absorptionOptions(engineContext: ReturnType<typeof createTestEngine>) {
	return {
		absorptionResourceId: ensureAbsorptionRegistered(engineContext),
	};
}

describe('absorption cap', () => {
	it('caps absorption at 100%', () => {
		const engineContext = createTestEngine();
		const defender = engineContext.game.opponent;
		setAbsorption(engineContext, defender, 1.5);
		const start = defender.resources[Resource.castleHP];
		const result = resolveAttack(
			defender,
			5,
			engineContext,
			{
				type: 'resource',
				key: Resource.castleHP,
			},
			absorptionOptions(engineContext),
		);
		expect(result.damageDealt).toBe(0);
		expect(defender.resources[Resource.castleHP]).toBe(start);
	});
});
