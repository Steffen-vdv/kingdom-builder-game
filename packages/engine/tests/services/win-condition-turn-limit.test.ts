import { describe, it, expect } from 'vitest';
import { WinConditionService } from '../../src/services/win_condition_service';
import { createTestEngine } from '../helpers';
import type { WinConditionDefinition } from '@kingdom-builder/protocol';

describe('turn-limit win condition', () => {
	function createTurnLimitCondition(maxTurns: number): WinConditionDefinition {
		return {
			id: 'score-victory',
			trigger: {
				type: 'turn-limit',
				maxTurns,
				scoreResourceId: 'resource:core:vp',
			},
			result: { subject: 'victory' },
		};
	}

	it('does not trigger before max turns', () => {
		const context = createTestEngine({
			skipInitialSetup: true,
		});
		context.game.turn = 5;

		const service = new WinConditionService([createTurnLimitCondition(30)]);

		service.evaluateTurnAdvance(context);
		expect(context.game.conclusion).toBeUndefined();
	});

	it('triggers when turn exceeds maxTurns', () => {
		const context = createTestEngine({
			skipInitialSetup: true,
		});
		context.game.turn = 31;
		context.game.players[0]!.resourceValues['resource:core:vp'] = 50;
		context.game.players[1]!.resourceValues['resource:core:vp'] = 30;

		const service = new WinConditionService([createTurnLimitCondition(30)]);

		service.evaluateTurnAdvance(context);
		expect(context.game.conclusion).toBeDefined();
		expect(context.game.conclusion!.winnerId).toBe('A');
		expect(context.game.conclusion!.loserId).toBe('B');
	});

	it('awards victory to player with higher score', () => {
		const context = createTestEngine({
			skipInitialSetup: true,
		});
		context.game.turn = 31;
		context.game.players[0]!.resourceValues['resource:core:vp'] = 20;
		context.game.players[1]!.resourceValues['resource:core:vp'] = 60;

		const service = new WinConditionService([createTurnLimitCondition(30)]);

		service.evaluateTurnAdvance(context);
		expect(context.game.conclusion!.winnerId).toBe('B');
	});

	it('awards tie to player A', () => {
		const context = createTestEngine({
			skipInitialSetup: true,
		});
		context.game.turn = 31;
		context.game.players[0]!.resourceValues['resource:core:vp'] = 40;
		context.game.players[1]!.resourceValues['resource:core:vp'] = 40;

		const service = new WinConditionService([createTurnLimitCondition(30)]);

		service.evaluateTurnAdvance(context);
		expect(context.game.conclusion!.winnerId).toBe('A');
	});
});
