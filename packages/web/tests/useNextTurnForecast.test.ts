import { describe, expect, beforeEach, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
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
	enqueueSimulateUpcomingPhases: vi.fn(),
}));

vi.mock('../src/state/sessionSdk', () => ({
	enqueueSimulateUpcomingPhases: simulationMocks.enqueueSimulateUpcomingPhases,
}));

const jsdom = new JSDOM('<!doctype html><html><body></body></html>');
vi.stubGlobal('window', jsdom.window as unknown as typeof globalThis);
vi.stubGlobal('document', jsdom.window.document);
vi.stubGlobal('navigator', jsdom.window.navigator);

interface MockGameEngine {
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

function cloneEmptyDelta(): PlayerSnapshotDeltaBucket {
	return {
		resources: {},
		stats: {},
		population: {},
	};
}

function emptyPlayerSnapshot(): SessionPlayerStateSnapshot {
	return {} as SessionPlayerStateSnapshot;
}

function buildSimulationResponse(
	playerId: string,
	delta: PlayerSnapshotDeltaBucket,
) {
	return {
		sessionId: engineValue.sessionId,
		result: {
			playerId,
			before: emptyPlayerSnapshot(),
			after: emptyPlayerSnapshot(),
			delta,
			steps: [],
		},
	};
}

const engineValue: MockGameEngine = {
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
		simulationMocks.enqueueSimulateUpcomingPhases.mockReset();
		simulationMocks.enqueueSimulateUpcomingPhases.mockImplementation(
			(_sessionId, playerId) =>
				Promise.resolve(buildSimulationResponse(playerId, cloneEmptyDelta())),
		);
		resetSessionState([createPlayer(1), createPlayer(2)]);
	});

	async function flushAsync(iterations = 3): Promise<void> {
		for (let index = 0; index < iterations; index += 1) {
			await act(async () => {
				await Promise.resolve();
			});
		}
	}

	function mockSimulationResponse(
		getDelta: (playerId: string) => PlayerSnapshotDeltaBucket,
	): void {
		simulationMocks.enqueueSimulateUpcomingPhases.mockImplementation(
			(_sessionId, playerId) =>
				Promise.resolve(buildSimulationResponse(playerId, getDelta(playerId))),
		);
	}

	it('fetches and caches per-player forecasts for stable snapshots', async () => {
		mockSimulationResponse((playerId) =>
			createDelta(playerId === firstPlayerId ? 3 : 5),
		);
		const { result, rerender } = renderHook(() => useNextTurnForecast());
		expect(result.current[firstPlayerId]).toEqual(cloneEmptyDelta());
		expect(result.current[secondPlayerId]).toEqual(cloneEmptyDelta());

		await flushAsync();
		expect(simulationMocks.enqueueSimulateUpcomingPhases).toHaveBeenCalledTimes(
			2,
		);
		expect(result.current[firstPlayerId]).toEqual(createDelta(3));
		expect(result.current[secondPlayerId]).toEqual(createDelta(5));

		simulationMocks.enqueueSimulateUpcomingPhases.mockClear();
		rerender();
		await flushAsync();
		expect(
			simulationMocks.enqueueSimulateUpcomingPhases,
		).not.toHaveBeenCalled();
		expect(result.current[firstPlayerId]).toEqual(createDelta(3));
		expect(result.current[secondPlayerId]).toEqual(createDelta(5));

		simulationMocks.enqueueSimulateUpcomingPhases.mockClear();
		setPlayers([createPlayer(1), createPlayer(2)]);
		rerender();
		await flushAsync();
		expect(
			simulationMocks.enqueueSimulateUpcomingPhases,
		).not.toHaveBeenCalled();
		expect(result.current[firstPlayerId]).toEqual(createDelta(3));
		expect(result.current[secondPlayerId]).toEqual(createDelta(5));
	});

	it('retries failed simulations after state changes', async () => {
		const failure = new Error('fail');
		simulationMocks.enqueueSimulateUpcomingPhases.mockImplementationOnce(() =>
			Promise.reject(failure),
		);
		simulationMocks.enqueueSimulateUpcomingPhases.mockImplementation(
			(_sessionId, playerId) =>
				Promise.resolve(buildSimulationResponse(playerId, createDelta(7))),
		);

		const { result, rerender } = renderHook(() => useNextTurnForecast());
		await flushAsync();
		expect(simulationMocks.enqueueSimulateUpcomingPhases).toHaveBeenCalledTimes(
			2,
		);
		expect(result.current[firstPlayerId]).toEqual(cloneEmptyDelta());
		expect(result.current[secondPlayerId]).toEqual(createDelta(7));

		simulationMocks.enqueueSimulateUpcomingPhases.mockClear();
		mockSimulationResponse(() => createDelta(9));
		setPlayers([
			createPlayer(1, {
				resources: { [primaryResource]: 11 },
			}),
			createPlayer(2),
		]);
		rerender();
		await flushAsync();
		expect(simulationMocks.enqueueSimulateUpcomingPhases).toHaveBeenCalledTimes(
			2,
		);
		expect(result.current[firstPlayerId]).toEqual(createDelta(9));
		expect(result.current[secondPlayerId]).toEqual(createDelta(9));
	});

	it('recomputes when game state changes without player deltas', async () => {
		mockSimulationResponse((playerId) =>
			createDelta(playerId === firstPlayerId ? 4 : 6),
		);
		const { result, rerender } = renderHook(() => useNextTurnForecast());
		await flushAsync();
		expect(simulationMocks.enqueueSimulateUpcomingPhases).toHaveBeenCalledTimes(
			2,
		);
		expect(result.current[firstPlayerId]).toEqual(createDelta(4));
		expect(result.current[secondPlayerId]).toEqual(createDelta(6));

		simulationMocks.enqueueSimulateUpcomingPhases.mockClear();
		mockSimulationResponse((playerId) =>
			createDelta(playerId === firstPlayerId ? 4 : 6),
		);
		setGameState({ turn: engineValue.sessionSnapshot.game.turn + 1 });
		rerender();
		await flushAsync();
		expect(simulationMocks.enqueueSimulateUpcomingPhases).toHaveBeenCalledTimes(
			2,
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
		mockSimulationResponse((playerId) =>
			createDelta(playerId === firstPlayerId ? 2 : 3),
		);
		const { result, rerender } = renderHook(() => useNextTurnForecast());
		await flushAsync();
		expect(simulationMocks.enqueueSimulateUpcomingPhases).toHaveBeenCalledTimes(
			2,
		);
		expect(result.current[firstPlayerId]).toEqual(createDelta(2));
		expect(result.current[secondPlayerId]).toEqual(createDelta(3));

		simulationMocks.enqueueSimulateUpcomingPhases.mockClear();
		mockSimulationResponse((playerId) =>
			createDelta(playerId === firstPlayerId ? 2 : 3),
		);
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
		expect(simulationMocks.enqueueSimulateUpcomingPhases).toHaveBeenCalledTimes(
			2,
		);
		expect(result.current[firstPlayerId]).toEqual(createDelta(2));
		expect(result.current[secondPlayerId]).toEqual(createDelta(3));
	});
});
