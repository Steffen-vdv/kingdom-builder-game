import { describe, expect, beforeEach, it, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { JSDOM } from 'jsdom';
import type {
	PlayerSnapshotDeltaBucket,
	SessionPlayerStateSnapshot,
	SessionRuleSnapshot,
	SessionSnapshot,
} from '@kingdom-builder/protocol';
import {
	resetNextTurnForecastCacheForTests,
	useNextTurnForecast,
} from '../src/state/useNextTurnForecast';
import { createSessionHelpers } from './utils/sessionStateHelpers';
import { createSessionRegistries } from './helpers/sessionRegistries';
import { createDefaultTranslationAssets } from './helpers/translationAssets';
import type { SessionResourceKey } from '../src/state/sessionTypes';

const simulationMocks = vi.hoisted(() => ({
	simulateUpcomingPhases: vi.fn(),
	enqueueSimulateUpcomingPhases: vi.fn(),
}));

const sessionAiMocks = vi.hoisted(() => ({
	simulateUpcomingPhases: vi.fn(),
}));

vi.mock('../src/state/sessionSdk', () => ({
	simulateUpcomingPhases: simulationMocks.simulateUpcomingPhases,
	enqueueSimulateUpcomingPhases: simulationMocks.enqueueSimulateUpcomingPhases,
}));

vi.mock('../src/state/sessionAi', () => ({
	simulateUpcomingPhases: sessionAiMocks.simulateUpcomingPhases,
}));

const jsdom = new JSDOM('<!doctype html><html><body></body></html>');
vi.stubGlobal('window', jsdom.window as unknown as typeof globalThis);
vi.stubGlobal('document', jsdom.window.document);
vi.stubGlobal('navigator', jsdom.window.navigator);

interface MockGameEngine {
	session: {
		enqueue: ReturnType<typeof vi.fn>;
		simulateUpcomingPhases: ReturnType<typeof vi.fn>;
		hasAiController: () => boolean;
		getActionDefinition: () => undefined;
		runAiTurn: ReturnType<typeof vi.fn>;
		advancePhase: ReturnType<typeof vi.fn>;
	};
	sessionSnapshot: SessionSnapshot;
	ruleSnapshot: SessionRuleSnapshot;
	resolution: null;
	showResolution: ReturnType<typeof vi.fn>;
	acknowledgeResolution: ReturnType<typeof vi.fn>;
	sessionId: string;
}

const registries = createSessionRegistries();
const populationKeys = registries.populations.keys();
const primaryPopulation = populationKeys[0] ?? 'council';
const resourceKeys = Object.keys(registries.resources) as SessionResourceKey[];
const primaryResource =
	resourceKeys[0] ?? ('resource-fallback' as SessionResourceKey);
const translationAssets = createDefaultTranslationAssets();
const statKeys = Object.keys(translationAssets.stats);
const primaryStat = statKeys[0] ?? 'maxPopulation';
const defaultPhases: SessionSnapshot['phases'] = [
	{ id: 'growth', steps: [] },
	{ id: 'upkeep', steps: [] },
	{ id: 'main', steps: [] },
];

function createPlayer(
	index: number,
	overrides: Partial<SessionPlayerStateSnapshot> = {},
): SessionPlayerStateSnapshot {
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
	session: {
		enqueue: vi.fn(),
		simulateUpcomingPhases: vi.fn(),
		hasAiController: () => false,
		getActionDefinition: () => undefined,
		runAiTurn: vi.fn().mockResolvedValue(false),
		advancePhase: vi.fn(),
	},
	sessionSnapshot: undefined as unknown as SessionSnapshot,
	ruleSnapshot: {
		tieredResourceKey: primaryResource,
		tierDefinitions: [],
		winConditions: [],
	},
	resolution: null,
	showResolution: vi.fn().mockResolvedValue(undefined),
	acknowledgeResolution: vi.fn(),
	sessionId: 'session-test',
};

const sessionHelpers = createSessionHelpers(engineValue, {
	primaryResource,
	defaultPhases,
});

const resetSessionState = (players: SessionPlayerStateSnapshot[]) =>
	sessionHelpers.reset(players);
const setPlayers = (players: SessionPlayerStateSnapshot[]) =>
	sessionHelpers.setPlayers(players);
const setGameState = (overrides: Partial<SessionSnapshot['game']>) =>
	sessionHelpers.setGameState(overrides);

engineValue.sessionSnapshot = sessionHelpers.createSessionState([]);

vi.mock('../src/state/GameContext', () => ({
	useGameEngine: (): MockGameEngine => engineValue,
}));

describe('useNextTurnForecast', () => {
	const firstPlayerId = createPlayer(1).id;
	const secondPlayerId = createPlayer(2).id;

	beforeEach(() => {
		resetNextTurnForecastCacheForTests();
		simulationMocks.simulateUpcomingPhases.mockReset();
		simulationMocks.enqueueSimulateUpcomingPhases.mockReset();
		simulationMocks.simulateUpcomingPhases.mockResolvedValue({
			sessionId: engineValue.sessionId,
			result: {
				playerId: '',
				before: {} as SessionPlayerStateSnapshot,
				after: {} as SessionPlayerStateSnapshot,
				delta: cloneEmptyDelta(),
				steps: [],
			},
		});
		simulationMocks.enqueueSimulateUpcomingPhases.mockImplementation(
			(sessionId: string, playerId: string) =>
				simulationMocks.simulateUpcomingPhases({
					sessionId,
					playerId,
				}),
		);
		sessionAiMocks.simulateUpcomingPhases.mockReset();
		resetSessionState([createPlayer(1), createPlayer(2)]);
	});

	function cloneEmptyDelta(): PlayerSnapshotDeltaBucket {
		return {
			resources: {},
			stats: {},
			population: {},
		};
	}

	async function flushAsync(): Promise<void> {
		await Promise.resolve();
		await Promise.resolve();
	}

	function mockSimulationResponse(
		getDelta: (playerId: string) => PlayerSnapshotDeltaBucket,
	): void {
		simulationMocks.simulateUpcomingPhases.mockImplementation(
			(request: { playerId: string }) =>
				Promise.resolve({
					sessionId: engineValue.sessionId,
					result: {
						playerId: request.playerId,
						before: {} as SessionPlayerStateSnapshot,
						after: {} as SessionPlayerStateSnapshot,
						delta: getDelta(request.playerId),
						steps: [],
					},
				}),
		);
	}

	it('memoizes per-player forecasts for stable snapshots', async () => {
		sessionAiMocks.simulateUpcomingPhases.mockImplementation(
			(_sessionId: string, playerId: string) => {
				const deltaAmount = playerId === firstPlayerId ? 3 : 5;
				return {
					playerId,
					before: {} as SessionPlayerStateSnapshot,
					after: {} as SessionPlayerStateSnapshot,
					delta: createDelta(deltaAmount),
					steps: [],
				};
			},
		);
		mockSimulationResponse((playerId) =>
			createDelta(playerId === firstPlayerId ? 3 : 5),
		);
		const { result, rerender } = renderHook(() => useNextTurnForecast());
		expect(sessionAiMocks.simulateUpcomingPhases).toHaveBeenCalledTimes(2);
		expect(result.current[firstPlayerId]).toEqual(createDelta(3));
		expect(result.current[secondPlayerId]).toEqual(createDelta(5));

		await flushAsync();
		expect(simulationMocks.simulateUpcomingPhases).toHaveBeenCalledTimes(2);
		expect(simulationMocks.enqueueSimulateUpcomingPhases).toHaveBeenCalledTimes(
			2,
		);

		sessionAiMocks.simulateUpcomingPhases.mockClear();
		rerender();
		await flushAsync();
		expect(sessionAiMocks.simulateUpcomingPhases).not.toHaveBeenCalled();
		expect(simulationMocks.simulateUpcomingPhases).toHaveBeenCalledTimes(2);
		expect(simulationMocks.enqueueSimulateUpcomingPhases).toHaveBeenCalledTimes(
			2,
		);
		expect(result.current[firstPlayerId]).toEqual(createDelta(3));
		expect(result.current[secondPlayerId]).toEqual(createDelta(5));

		sessionAiMocks.simulateUpcomingPhases.mockClear();
		setPlayers([createPlayer(1), createPlayer(2)]);
		rerender();
		await flushAsync();
		expect(sessionAiMocks.simulateUpcomingPhases).not.toHaveBeenCalled();
		expect(simulationMocks.simulateUpcomingPhases).toHaveBeenCalledTimes(2);
		expect(simulationMocks.enqueueSimulateUpcomingPhases).toHaveBeenCalledTimes(
			2,
		);
		expect(result.current[firstPlayerId]).toEqual(createDelta(3));
		expect(result.current[secondPlayerId]).toEqual(createDelta(5));
	});

	it('recomputes after updates when a simulation fails', async () => {
		sessionAiMocks.simulateUpcomingPhases.mockImplementation(
			(_sessionId: string, playerId: string) => {
				if (playerId === firstPlayerId) {
					throw new Error('fail');
				}
				return {
					playerId,
					before: {} as SessionPlayerStateSnapshot,
					after: {} as SessionPlayerStateSnapshot,
					delta: createDelta(7),
					steps: [],
				};
			},
		);
		mockSimulationResponse(() => createDelta(7));
		const { result, rerender } = renderHook(() => useNextTurnForecast());
		expect(sessionAiMocks.simulateUpcomingPhases).toHaveBeenCalledTimes(2);
		expect(result.current[firstPlayerId]).toEqual({
			resources: {},
			stats: {},
			population: {},
		});
		expect(result.current[secondPlayerId]).toEqual(createDelta(7));

		await flushAsync();
		expect(simulationMocks.simulateUpcomingPhases).toHaveBeenCalledTimes(2);
		expect(simulationMocks.enqueueSimulateUpcomingPhases).toHaveBeenCalledTimes(
			2,
		);

		sessionAiMocks.simulateUpcomingPhases.mockClear();
		setPlayers([
			createPlayer(1, {
				resources: { [primaryResource]: 11 },
			}),
			createPlayer(2),
		]);
		rerender();
		await flushAsync();
		expect(sessionAiMocks.simulateUpcomingPhases).toHaveBeenCalledTimes(2);
		expect(simulationMocks.simulateUpcomingPhases).toHaveBeenCalledTimes(4);
		expect(simulationMocks.enqueueSimulateUpcomingPhases).toHaveBeenCalledTimes(
			4,
		);
	});

	it('recomputes when game state changes without player deltas', async () => {
		sessionAiMocks.simulateUpcomingPhases.mockImplementation(
			(_sessionId: string, playerId: string) => {
				const deltaAmount = playerId === firstPlayerId ? 4 : 6;
				return {
					playerId,
					before: {} as SessionPlayerStateSnapshot,
					after: {} as SessionPlayerStateSnapshot,
					delta: createDelta(deltaAmount),
					steps: [],
				};
			},
		);
		mockSimulationResponse((playerId) =>
			createDelta(playerId === firstPlayerId ? 4 : 6),
		);
		const { result, rerender } = renderHook(() => useNextTurnForecast());
		expect(sessionAiMocks.simulateUpcomingPhases).toHaveBeenCalledTimes(2);
		expect(result.current[firstPlayerId]).toEqual(createDelta(4));
		expect(result.current[secondPlayerId]).toEqual(createDelta(6));

		await flushAsync();
		expect(simulationMocks.simulateUpcomingPhases).toHaveBeenCalledTimes(2);
		expect(simulationMocks.enqueueSimulateUpcomingPhases).toHaveBeenCalledTimes(
			2,
		);

		sessionAiMocks.simulateUpcomingPhases.mockClear();
		setGameState({ turn: engineValue.sessionSnapshot.game.turn + 1 });
		rerender();
		await flushAsync();
		expect(sessionAiMocks.simulateUpcomingPhases).toHaveBeenCalledTimes(2);
		expect(simulationMocks.simulateUpcomingPhases).toHaveBeenCalledTimes(4);
		expect(simulationMocks.enqueueSimulateUpcomingPhases).toHaveBeenCalledTimes(
			4,
		);
		expect(result.current[firstPlayerId]).toEqual(createDelta(4));
		expect(result.current[secondPlayerId]).toEqual(createDelta(6));
	});

	it('recomputes when land details change without affecting counts', async () => {
		const baseLand: SessionPlayerStateSnapshot['lands'][number] = {
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
		sessionAiMocks.simulateUpcomingPhases.mockImplementation(
			(_sessionId: string, playerId: string) => {
				const deltaAmount = playerId === firstPlayerId ? 2 : 3;
				return {
					playerId,
					before: {} as SessionPlayerStateSnapshot,
					after: {} as SessionPlayerStateSnapshot,
					delta: createDelta(deltaAmount),
					steps: [],
				};
			},
		);
		mockSimulationResponse((playerId) =>
			createDelta(playerId === firstPlayerId ? 2 : 3),
		);
		const { result, rerender } = renderHook(() => useNextTurnForecast());
		expect(sessionAiMocks.simulateUpcomingPhases).toHaveBeenCalledTimes(2);
		expect(result.current[firstPlayerId]).toEqual(createDelta(2));
		expect(result.current[secondPlayerId]).toEqual(createDelta(3));

		await flushAsync();
		expect(simulationMocks.simulateUpcomingPhases).toHaveBeenCalledTimes(2);
		expect(simulationMocks.enqueueSimulateUpcomingPhases).toHaveBeenCalledTimes(
			2,
		);

		sessionAiMocks.simulateUpcomingPhases.mockClear();
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
		await flushAsync();
		expect(sessionAiMocks.simulateUpcomingPhases).toHaveBeenCalledTimes(2);
		expect(simulationMocks.simulateUpcomingPhases).toHaveBeenCalledTimes(4);
		expect(simulationMocks.enqueueSimulateUpcomingPhases).toHaveBeenCalledTimes(
			4,
		);
		expect(result.current[firstPlayerId]).toEqual(createDelta(2));
		expect(result.current[secondPlayerId]).toEqual(createDelta(3));
	});
});
