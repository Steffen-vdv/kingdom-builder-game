import { describe, expect, it, beforeEach, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useNextTurnForecast } from '../src/state/useNextTurnForecast';
import {
	createSessionSnapshot,
	createSnapshotPlayer,
} from './helpers/sessionFixtures';

let currentSessionState = createSessionSnapshot({
	players: [
		createSnapshotPlayer({ id: 'player-1' }),
		createSnapshotPlayer({ id: 'player-2' }),
	],
	activePlayerId: 'player-1',
	opponentId: 'player-2',
	phases: [{ id: 'phase-main', steps: [], action: true }],
	actionCostResource: 'resource-1',
	ruleSnapshot: {
		tieredResourceKey: 'resource-1',
		tierDefinitions: [],
		winConditions: [],
	},
});

vi.mock('../src/state/GameContext', () => ({
	useGameEngine: () => ({
		sessionState: currentSessionState,
	}),
}));

describe('useNextTurnForecast', () => {
	beforeEach(() => {
		currentSessionState = createSessionSnapshot({
			players: [
				createSnapshotPlayer({ id: 'player-1' }),
				createSnapshotPlayer({ id: 'player-2' }),
			],
			activePlayerId: 'player-1',
			opponentId: 'player-2',
			phases: [{ id: 'phase-main', steps: [], action: true }],
			actionCostResource: 'resource-1',
			ruleSnapshot: {
				tieredResourceKey: 'resource-1',
				tierDefinitions: [],
				winConditions: [],
			},
		});
	});

	it('returns empty deltas for each player', () => {
		const { result } = renderHook(() => useNextTurnForecast());
		expect(result.current).toEqual({
			'player-1': { resources: {}, stats: {}, population: {} },
			'player-2': { resources: {}, stats: {}, population: {} },
		});
	});

	it('updates when the player list changes', () => {
		const { result, rerender } = renderHook(() => useNextTurnForecast());
		expect(result.current).toEqual({
			'player-1': { resources: {}, stats: {}, population: {} },
			'player-2': { resources: {}, stats: {}, population: {} },
		});
		currentSessionState = createSessionSnapshot({
			players: [
				createSnapshotPlayer({ id: 'player-1' }),
				createSnapshotPlayer({ id: 'player-2' }),
				createSnapshotPlayer({ id: 'player-3' }),
			],
			activePlayerId: 'player-1',
			opponentId: 'player-2',
			phases: [{ id: 'phase-main', steps: [], action: true }],
			actionCostResource: 'resource-1',
			ruleSnapshot: {
				tieredResourceKey: 'resource-1',
				tierDefinitions: [],
				winConditions: [],
			},
		});
		rerender();
		expect(result.current).toEqual({
			'player-1': { resources: {}, stats: {}, population: {} },
			'player-2': { resources: {}, stats: {}, population: {} },
			'player-3': { resources: {}, stats: {}, population: {} },
		});
	});
});
