import { describe, expect, beforeEach, it, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { JSDOM } from 'jsdom';
import {
	RESOURCES,
	STATS,
	POPULATIONS,
	type ResourceKey,
	type StatKey,
	type PopulationRoleId,
} from '@kingdom-builder/contents';
import {
	type EngineSessionSnapshot,
	type PlayerSnapshotDeltaBucket,
	type PlayerStateSnapshot,
} from '@kingdom-builder/engine';
import { useNextTurnForecast } from '../src/state/useNextTurnForecast';
import { createSessionHelpers } from './utils/sessionStateHelpers';

const simulateUpcomingPhasesMock = vi.hoisted(() => vi.fn());

const jsdom = new JSDOM('<!doctype html><html><body></body></html>');
vi.stubGlobal('window', jsdom.window as unknown as typeof globalThis);
vi.stubGlobal('document', jsdom.window.document);
vi.stubGlobal('navigator', jsdom.window.navigator);

vi.mock('@kingdom-builder/engine', async () => {
	const actual = await vi.importActual('@kingdom-builder/engine');
	return {
		...(actual as Record<string, unknown>),
		simulateUpcomingPhases: simulateUpcomingPhasesMock,
	};
});

interface MockGameEngine {
	session: { getLegacyContext: ReturnType<typeof vi.fn> };
	sessionState: EngineSessionSnapshot;
}

const [primaryResource] = Object.keys(RESOURCES) as ResourceKey[];
const [primaryStat] = Object.keys(STATS) as StatKey[];
const [primaryPopulation] = Object.keys(POPULATIONS) as PopulationRoleId[];
const defaultPhases: EngineSessionSnapshot['phases'] = [
	{ id: 'growth', steps: [] },
	{ id: 'upkeep', steps: [] },
	{ id: 'main', steps: [] },
];

function createPlayer(
	index: number,
	overrides: Partial<PlayerStateSnapshot> = {},
): PlayerStateSnapshot {
	const {
		resources: overrideResources,
		stats: overrideStats,
		population: overridePopulation,
		...restOverrides
	} = overrides;
	return {
		id: `player-${index}`,
		name: `Player ${index}`,
		resources: {
			[primaryResource]: index,
			...(overrideResources ?? {}),
		},
		stats: {
			[primaryStat]: index * 2,
			...(overrideStats ?? {}),
		},
		population: {
			[primaryPopulation]: index,
			...(overridePopulation ?? {}),
		},
		statsHistory: {},
		lands: [],
		buildings: [],
		actions: [],
		statSources: {},
		skipPhases: {},
		skipSteps: {},
		passives: [],
		...restOverrides,
	};
}

function createDelta(amount: number): PlayerSnapshotDeltaBucket {
	return {
		resources: { [primaryResource]: amount },
		stats: { [primaryStat]: amount * 2 },
		population: { [primaryPopulation]: amount },
	};
}

const contextStub = { context: true } as const;
const engineValue: MockGameEngine = {
	session: { getLegacyContext: vi.fn(() => contextStub) },
	sessionState: undefined as unknown as EngineSessionSnapshot,
};

const sessionHelpers = createSessionHelpers(engineValue, {
	primaryResource,
	defaultPhases,
});

const resetSessionState = (players: PlayerStateSnapshot[]) =>
	sessionHelpers.reset(players);
const setPlayers = (players: PlayerStateSnapshot[]) =>
	sessionHelpers.setPlayers(players);
const setGameState = (overrides: Partial<EngineSessionSnapshot['game']>) =>
	sessionHelpers.setGameState(overrides);

engineValue.sessionState = sessionHelpers.createSessionState([]);

vi.mock('../src/state/GameContext', () => ({
	useGameEngine: (): MockGameEngine => engineValue,
}));

describe('useNextTurnForecast', () => {
	const firstPlayerId = createPlayer(1).id;
	const secondPlayerId = createPlayer(2).id;

	beforeEach(() => {
		simulateUpcomingPhasesMock.mockReset();
		engineValue.session.getLegacyContext.mockClear();
		resetSessionState([createPlayer(1), createPlayer(2)]);
	});

	it('memoizes per-player forecasts for stable snapshots', () => {
		simulateUpcomingPhasesMock.mockImplementation((_, playerId: string) => {
			const deltaAmount = playerId === firstPlayerId ? 3 : 5;
			return {
				playerId,
				before: {} as PlayerStateSnapshot,
				after: {} as PlayerStateSnapshot,
				delta: createDelta(deltaAmount),
				steps: [],
			};
		});
		const { result, rerender } = renderHook(() => useNextTurnForecast());
		expect(simulateUpcomingPhasesMock).toHaveBeenCalledTimes(2);
		expect(result.current[firstPlayerId]).toEqual(createDelta(3));
		expect(result.current[secondPlayerId]).toEqual(createDelta(5));

		simulateUpcomingPhasesMock.mockClear();
		rerender();
		expect(simulateUpcomingPhasesMock).not.toHaveBeenCalled();
		expect(result.current[firstPlayerId]).toEqual(createDelta(3));
		expect(result.current[secondPlayerId]).toEqual(createDelta(5));

		simulateUpcomingPhasesMock.mockClear();
		setPlayers([createPlayer(1), createPlayer(2)]);
		rerender();
		expect(simulateUpcomingPhasesMock).not.toHaveBeenCalled();
		expect(result.current[firstPlayerId]).toEqual(createDelta(3));
		expect(result.current[secondPlayerId]).toEqual(createDelta(5));
	});

	it('recomputes after updates when a simulation fails', () => {
		simulateUpcomingPhasesMock.mockImplementation((_, playerId: string) => {
			if (playerId === firstPlayerId) {
				throw new Error('fail');
			}
			return {
				playerId,
				before: {} as PlayerStateSnapshot,
				after: {} as PlayerStateSnapshot,
				delta: createDelta(7),
				steps: [],
			};
		});
		const { result, rerender } = renderHook(() => useNextTurnForecast());
		expect(simulateUpcomingPhasesMock).toHaveBeenCalledTimes(2);
		expect(result.current[firstPlayerId]).toEqual({
			resources: {},
			stats: {},
			population: {},
		});
		expect(result.current[secondPlayerId]).toEqual(createDelta(7));

		simulateUpcomingPhasesMock.mockClear();
		setPlayers([
			createPlayer(1, {
				resources: { [primaryResource]: 11 },
			}),
			createPlayer(2),
		]);
		rerender();
		expect(simulateUpcomingPhasesMock).toHaveBeenCalledTimes(2);
	});

	it('recomputes when game state changes without player deltas', () => {
		simulateUpcomingPhasesMock.mockImplementation((_, playerId: string) => {
			const deltaAmount = playerId === firstPlayerId ? 4 : 6;
			return {
				playerId,
				before: {} as PlayerStateSnapshot,
				after: {} as PlayerStateSnapshot,
				delta: createDelta(deltaAmount),
				steps: [],
			};
		});
		const { result, rerender } = renderHook(() => useNextTurnForecast());
		expect(simulateUpcomingPhasesMock).toHaveBeenCalledTimes(2);
		expect(result.current[firstPlayerId]).toEqual(createDelta(4));
		expect(result.current[secondPlayerId]).toEqual(createDelta(6));

		simulateUpcomingPhasesMock.mockClear();
		setGameState({ turn: engineValue.sessionState.game.turn + 1 });
		rerender();
		expect(simulateUpcomingPhasesMock).toHaveBeenCalledTimes(2);
		expect(result.current[firstPlayerId]).toEqual(createDelta(4));
		expect(result.current[secondPlayerId]).toEqual(createDelta(6));
	});
});
