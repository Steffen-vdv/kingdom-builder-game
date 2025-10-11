/** @vitest-environment jsdom */
import { describe, expect, it } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import type {
	EngineSessionSnapshot,
	PlayerStateSnapshot,
} from '@kingdom-builder/engine';
import { MAX_LOG_ENTRIES, useGameLog } from '../../src/state/useGameLog';

const primaryResource = 'resource.primary';

const createPlayer = (id: string): PlayerStateSnapshot => ({
	id,
	name: `Player ${id}`,
	resources: { [primaryResource]: 0 },
	stats: {},
	statsHistory: {},
	population: {},
	lands: [
		{
			id: `${id}-land`,
			slotsMax: 1,
			slotsUsed: 0,
			tilled: true,
			developments: [],
		},
	],
	buildings: [],
	actions: [],
	statSources: {},
	skipPhases: {},
	skipSteps: {},
	passives: [],
});

describe('useGameLog', () => {
	it('preserves incrementing ids when trimming overflowing log entries', () => {
		const players: PlayerStateSnapshot[] = [
			createPlayer('A'),
			createPlayer('B'),
		];
		const sessionState: EngineSessionSnapshot = {
			game: {
				turn: 1,
				currentPlayerIndex: 0,
				currentPhase: 'main',
				currentStep: 'step-0',
				phaseIndex: 0,
				stepIndex: 0,
				devMode: false,
				players,
				activePlayerId: players[0]!.id,
				opponentId: players[1]!.id,
			},
			phases: [],
			actionCostResource: primaryResource,
			recentResourceGains: [],
			compensations: {},
			rules: {
				tieredResourceKey: primaryResource,
				tierDefinitions: [],
				winConditions: [],
			},
			passiveRecords: {
				[players[0]!.id]: [],
				[players[1]!.id]: [],
			},
			metadata: { passiveEvaluationModifiers: {} },
		};
		const { result } = renderHook(() => useGameLog({ sessionState }));

		act(() => {
			result.current.addLog('Initial entry');
		});
		expect(result.current.log[0]?.id).toBe(0);

		act(() => {
			for (let index = 1; index <= MAX_LOG_ENTRIES; index += 1) {
				result.current.addLog(`Message ${index}`);
			}
		});
		expect(result.current.log).toHaveLength(MAX_LOG_ENTRIES);
		const ids = result.current.log.map((entry) => entry.id);
		const uniqueIds = new Set(ids);
		expect(uniqueIds.size).toBe(MAX_LOG_ENTRIES);
		const isSequential = ids.every((id, index) => {
			if (index === 0) {
				return true;
			}
			return id === ids[index - 1]! + 1;
		});
		expect(isSequential).toBe(true);
		const preservedId = ids[Math.floor(ids.length / 2)];

		act(() => {
			result.current.addLog('Overflow entry');
		});
		expect(result.current.log).toHaveLength(MAX_LOG_ENTRIES);
		const updatedIds = result.current.log.map((entry) => entry.id);
		expect(updatedIds).toContain(preservedId);
		const lastId = updatedIds[updatedIds.length - 1];
		expect(lastId).toBeGreaterThan(preservedId);
	});
});
