import { describe, expect, it } from 'vitest';
import { createTestEngine } from '../helpers';
import { GAME_START, Resource } from '@kingdom-builder/contents';

const DEFAULT_WIN_CONDITION_ID = (() => {
	const [condition] = GAME_START.winConditions ?? [];
	if (!condition) {
		throw new Error('Missing default win condition configuration.');
	}
	return condition.id;
})();

describe('WinConditionService', () => {
	it('marks the game as finished when an opponent castle falls', () => {
		const context = createTestEngine();
		const attacker = context.game.players[0]!;
		const defender = context.game.players[1]!;

		defender.resources[Resource.castleHP] = -2;
		context.services.notifyResourceChange(context, defender, Resource.castleHP);

		expect(context.game.outcome.status).toBe('finished');
		if (context.game.outcome.status !== 'finished') {
			throw new Error('Game should have ended.');
		}
		expect(context.game.outcome.winnerId).toBe(attacker.id);
		expect(context.game.outcome.loserId).toBe(defender.id);
		expect(context.game.outcome.conditionId).toBe(DEFAULT_WIN_CONDITION_ID);
		expect(context.game.outcome.triggeredPlayerId).toBe(defender.id);
		expect(context.game.outcome.triggeredResult).toBe('loss');
	});

	it('awards victory to the opponent when the active castle is destroyed', () => {
		const context = createTestEngine();
		const defender = context.game.players[1]!;
		const attacker = context.game.players[0]!;

		attacker.resources[Resource.castleHP] = 0;
		context.services.notifyResourceChange(context, attacker, Resource.castleHP);

		expect(context.game.outcome.status).toBe('finished');
		if (context.game.outcome.status !== 'finished') {
			throw new Error('Game should have ended.');
		}
		expect(context.game.outcome.winnerId).toBe(defender.id);
		expect(context.game.outcome.loserId).toBe(attacker.id);
		expect(context.game.outcome.conditionId).toBe(DEFAULT_WIN_CONDITION_ID);
		expect(context.game.outcome.triggeredPlayerId).toBe(attacker.id);
		expect(context.game.outcome.triggeredResult).toBe('loss');
	});
});
