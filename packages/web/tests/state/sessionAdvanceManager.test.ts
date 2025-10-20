/** @vitest-environment jsdom */
import { describe, expect, it } from 'vitest';
import type { SessionAdvanceResult } from '@kingdom-builder/protocol/session';
import { SessionAdvanceManager } from '../../src/state/sessionAdvanceManager';

describe('SessionAdvanceManager', () => {
	it('synchronizes cached advance results with updated player names', () => {
		const manager = new SessionAdvanceManager('session-1', {
			getSessionRecord: () => undefined,
		});
		const advance: SessionAdvanceResult = {
			phase: 'growth',
			step: 'collect-income',
			effects: [],
			player: {
				id: 'A',
				name: 'Player A',
				aiControlled: false,
				resources: {},
				stats: {},
				statsHistory: {},
				population: {},
				lands: [],
				buildings: [],
				actions: [],
				statSources: {},
				skipPhases: {},
				skipSteps: {},
				passives: [],
			},
		};
		manager.recordAdvanceResult(advance);
		manager.syncPlayerName('A', 'Champion');
		const result = manager.advancePhase();
		expect(result.player.name).toBe('Champion');
	});
});
