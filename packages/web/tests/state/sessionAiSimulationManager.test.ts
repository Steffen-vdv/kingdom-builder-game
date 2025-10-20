/** @vitest-environment jsdom */
import { describe, expect, it } from 'vitest';
import type { SessionSimulateResponse } from '@kingdom-builder/protocol/session';
import { SessionAiSimulationManager } from '../../src/state/sessionAiSimulationManager';

const baseSnapshot = {
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
};

describe('SessionAiSimulationManager', () => {
	it('syncs cached simulation results when player names change', () => {
		const manager = new SessionAiSimulationManager('session-1', {
			runAiTurn: () => Promise.reject(new Error('Unexpected AI invocation')),
			getSessionRecord: () => undefined,
		});
		const result: SessionSimulateResponse['result'] = {
			playerId: 'A',
			before: { ...baseSnapshot },
			after: { ...baseSnapshot },
			delta: { resources: {}, stats: {}, population: {} },
			steps: [
				{
					phase: 'growth',
					step: 'collect',
					effects: [],
					player: { ...baseSnapshot },
				},
			],
		};
		manager.cacheSimulation('A', result);
		manager.syncPlayerName('A', 'Renamed Hero');
		const updated = manager.simulateUpcomingPhases('A');
		expect(updated.before.name).toBe('Renamed Hero');
		expect(updated.after.name).toBe('Renamed Hero');
		expect(updated.steps[0]?.player.name).toBe('Renamed Hero');
	});
});
