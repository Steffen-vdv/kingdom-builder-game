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
	type RuleSnapshot,
} from '@kingdom-builder/engine';
import { useNextTurnForecast } from '../src/state/useNextTurnForecast';
import { createSessionHelpers } from './utils/sessionStateHelpers';

const jsdom = new JSDOM('<!doctype html><html><body></body></html>');
vi.stubGlobal('window', jsdom.window as unknown as typeof globalThis);
vi.stubGlobal('document', jsdom.window.document);
vi.stubGlobal('navigator', jsdom.window.navigator);

interface MockGameEngine {
	sessionId: string;
	session: {
		simulateUpcomingPhases: ReturnType<typeof vi.fn>;
		hasAiController: () => boolean;
		getActionDefinition: () => undefined;
		runAiTurn: ReturnType<typeof vi.fn>;
		advancePhase: ReturnType<typeof vi.fn>;
	};
	sessionState: EngineSessionSnapshot;
	ruleSnapshot: RuleSnapshot;
	resolution: null;
	showResolution: ReturnType<typeof vi.fn>;
	acknowledgeResolution: ReturnType<typeof vi.fn>;
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

const engineValue: MockGameEngine = {
	sessionId: 'test-session',
	session: {
		simulateUpcomingPhases: vi.fn(),
		hasAiController: () => false,
		getActionDefinition: () => undefined,
		runAiTurn: vi.fn().mockResolvedValue(false),
		advancePhase: vi.fn(),
	},
	sessionState: undefined as unknown as EngineSessionSnapshot,
	ruleSnapshot: {
		tieredResourceKey: primaryResource,
		tierDefinitions: [],
		winConditions: [],
	},
	resolution: null,
	showResolution: vi.fn().mockResolvedValue(undefined),
	acknowledgeResolution: vi.fn(),
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
		engineValue.session.simulateUpcomingPhases.mockReset();
		resetSessionState([createPlayer(1), createPlayer(2)]);
	});

	it('memoizes per-player forecasts for stable snapshots', () => {
		engineValue.session.simulateUpcomingPhases.mockImplementation(
			(playerId: string) => {
				const deltaAmount = playerId === firstPlayerId ? 3 : 5;
				return {
					playerId,
					before: {} as PlayerStateSnapshot,
					after: {} as PlayerStateSnapshot,
					delta: createDelta(deltaAmount),
					steps: [],
				};
			},
		);
		const { result, rerender } = renderHook(() => useNextTurnForecast());
		expect(engineValue.session.simulateUpcomingPhases).toHaveBeenCalledTimes(2);
		expect(result.current[firstPlayerId]).toEqual(createDelta(3));
		expect(result.current[secondPlayerId]).toEqual(createDelta(5));

		engineValue.session.simulateUpcomingPhases.mockClear();
		rerender();
		expect(engineValue.session.simulateUpcomingPhases).not.toHaveBeenCalled();
		expect(result.current[firstPlayerId]).toEqual(createDelta(3));
		expect(result.current[secondPlayerId]).toEqual(createDelta(5));

		engineValue.session.simulateUpcomingPhases.mockClear();
		setPlayers([createPlayer(1), createPlayer(2)]);
		rerender();
		expect(engineValue.session.simulateUpcomingPhases).not.toHaveBeenCalled();
		expect(result.current[firstPlayerId]).toEqual(createDelta(3));
		expect(result.current[secondPlayerId]).toEqual(createDelta(5));
	});

	it('recomputes after updates when a simulation fails', () => {
		engineValue.session.simulateUpcomingPhases.mockImplementation(
			(playerId: string) => {
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
			},
		);
		const { result, rerender } = renderHook(() => useNextTurnForecast());
		expect(engineValue.session.simulateUpcomingPhases).toHaveBeenCalledTimes(2);
		expect(result.current[firstPlayerId]).toEqual({
			resources: {},
			stats: {},
			population: {},
		});
		expect(result.current[secondPlayerId]).toEqual(createDelta(7));

		engineValue.session.simulateUpcomingPhases.mockClear();
		setPlayers([
			createPlayer(1, {
				resources: { [primaryResource]: 11 },
			}),
			createPlayer(2),
		]);
		rerender();
		expect(engineValue.session.simulateUpcomingPhases).toHaveBeenCalledTimes(2);
	});

	it('recomputes when game state changes without player deltas', () => {
		engineValue.session.simulateUpcomingPhases.mockImplementation(
			(playerId: string) => {
				const deltaAmount = playerId === firstPlayerId ? 4 : 6;
				return {
					playerId,
					before: {} as PlayerStateSnapshot,
					after: {} as PlayerStateSnapshot,
					delta: createDelta(deltaAmount),
					steps: [],
				};
			},
		);
		const { result, rerender } = renderHook(() => useNextTurnForecast());
		expect(engineValue.session.simulateUpcomingPhases).toHaveBeenCalledTimes(2);
		expect(result.current[firstPlayerId]).toEqual(createDelta(4));
		expect(result.current[secondPlayerId]).toEqual(createDelta(6));

		engineValue.session.simulateUpcomingPhases.mockClear();
		setGameState({ turn: engineValue.sessionState.game.turn + 1 });
		rerender();
		expect(engineValue.session.simulateUpcomingPhases).toHaveBeenCalledTimes(2);
		expect(result.current[firstPlayerId]).toEqual(createDelta(4));
		expect(result.current[secondPlayerId]).toEqual(createDelta(6));
	});

	it('recomputes when land details change without affecting counts', () => {
		const baseLand: PlayerStateSnapshot['lands'][number] = {
			id: 'land-1',
			slotsMax: 2,
			slotsUsed: 1,
			tilled: true,
			developments: ['structure-a'],
		};
		resetSessionState([
			createPlayer(1, { lands: [baseLand] }),
			createPlayer(2),
		]);
		engineValue.session.simulateUpcomingPhases.mockImplementation(
			(playerId: string) => {
				const deltaAmount = playerId === firstPlayerId ? 2 : 3;
				return {
					playerId,
					before: {} as PlayerStateSnapshot,
					after: {} as PlayerStateSnapshot,
					delta: createDelta(deltaAmount),
					steps: [],
				};
			},
		);
		const { result, rerender } = renderHook(() => useNextTurnForecast());
		expect(engineValue.session.simulateUpcomingPhases).toHaveBeenCalledTimes(2);
		expect(result.current[firstPlayerId]).toEqual(createDelta(2));
		expect(result.current[secondPlayerId]).toEqual(createDelta(3));

		engineValue.session.simulateUpcomingPhases.mockClear();
		setPlayers([
			createPlayer(1, {
				lands: [
					{
						...baseLand,
						developments: ['structure-b'],
					},
				],
			}),
			createPlayer(2),
		]);
		rerender();
		expect(engineValue.session.simulateUpcomingPhases).toHaveBeenCalledTimes(2);
		expect(result.current[firstPlayerId]).toEqual(createDelta(2));
		expect(result.current[secondPlayerId]).toEqual(createDelta(3));
	});
});
