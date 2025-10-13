import { describe, expect, beforeEach, it, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { JSDOM } from 'jsdom';
import type {
	PlayerSnapshotDeltaBucket,
	SessionPlayerStateSnapshot,
	SessionRuleSnapshot,
	SessionSnapshot,
	SessionSimulateRequest,
	SessionSimulateResponse,
} from '@kingdom-builder/protocol';
import { useNextTurnForecast } from '../src/state/useNextTurnForecast';
import { createSessionHelpers } from './utils/sessionStateHelpers';
import { createSessionRegistries } from './helpers/sessionRegistries';
import { createDefaultTranslationAssets } from './helpers/translationAssets';
import type { SessionResourceKey } from '../src/state/sessionTypes';
import type { GameApiRequestOptions } from '../src/services/gameApi.types';

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
	sessionState: SessionSnapshot;
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
		enqueue: vi.fn(<T>(task: () => Promise<T> | T) =>
			Promise.resolve().then(task),
		),
		simulateUpcomingPhases: vi.fn(),
		hasAiController: () => false,
		getActionDefinition: () => undefined,
		runAiTurn: vi.fn().mockResolvedValue(false),
		advancePhase: vi.fn(),
	},
	sessionState: undefined as unknown as SessionSnapshot,
	ruleSnapshot: {
		tieredResourceKey: primaryResource,
		tierDefinitions: [],
		winConditions: [],
	},
	resolution: null,
	showResolution: vi.fn().mockResolvedValue(undefined),
	acknowledgeResolution: vi.fn(),
	sessionId: 'session-test-id',
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

engineValue.sessionState = sessionHelpers.createSessionState([]);

vi.mock('../src/state/GameContext', () => ({
	useGameEngine: (): MockGameEngine => engineValue,
}));

const simulateUpcomingPhasesMock = vi.fn<
	Promise<SessionSimulateResponse>,
	[SessionSimulateRequest, GameApiRequestOptions | undefined]
>();

vi.mock('../src/state/sessionSdk', () => ({
	simulateUpcomingPhases: (
		request: SessionSimulateRequest,
		options?: GameApiRequestOptions,
	) => simulateUpcomingPhasesMock(request, options),
}));

describe('useNextTurnForecast', () => {
	const firstPlayerId = createPlayer(1).id;
	const secondPlayerId = createPlayer(2).id;

	beforeEach(() => {
		simulateUpcomingPhasesMock.mockReset();
		engineValue.session.enqueue.mockClear();
		engineValue.session.simulateUpcomingPhases.mockReset();
		engineValue.session.simulateUpcomingPhases.mockImplementation(() => {
			throw new Error('no cached simulation');
		});
		resetSessionState([createPlayer(1), createPlayer(2)]);
	});

	it('memoizes per-player forecasts for stable snapshots', () => {
		simulateUpcomingPhasesMock.mockImplementation(({ playerId }) => {
			const deltaAmount = playerId === firstPlayerId ? 3 : 5;
			return Promise.resolve({
				sessionId: engineValue.sessionId,
				result: {
					playerId,
					before: {} as SessionPlayerStateSnapshot,
					after: {} as SessionPlayerStateSnapshot,
					delta: createDelta(deltaAmount),
					steps: [],
				},
			});
		});
		const { result, rerender } = renderHook(() => useNextTurnForecast());
		return waitFor(() => {
			expect(simulateUpcomingPhasesMock).toHaveBeenCalledTimes(2);
			expect(result.current[firstPlayerId]).toEqual(createDelta(3));
			expect(result.current[secondPlayerId]).toEqual(createDelta(5));
		}).then(() => {
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
	});

	it('recomputes after updates when a simulation fails', () => {
		simulateUpcomingPhasesMock.mockImplementation(({ playerId }) => {
			if (playerId === firstPlayerId) {
				return Promise.reject(new Error('fail'));
			}
			return Promise.resolve({
				sessionId: engineValue.sessionId,
				result: {
					playerId,
					before: {} as SessionPlayerStateSnapshot,
					after: {} as SessionPlayerStateSnapshot,
					delta: createDelta(7),
					steps: [],
				},
			});
		});
		const { result, rerender } = renderHook(() => useNextTurnForecast());
		return waitFor(() => {
			expect(simulateUpcomingPhasesMock).toHaveBeenCalledTimes(2);
			expect(result.current[firstPlayerId]).toEqual({
				resources: {},
				stats: {},
				population: {},
			});
			expect(result.current[secondPlayerId]).toEqual(createDelta(7));
		}).then(async () => {
			simulateUpcomingPhasesMock.mockReset();
			simulateUpcomingPhasesMock.mockImplementation(({ playerId }) =>
				Promise.resolve({
					sessionId: engineValue.sessionId,
					result: {
						playerId,
						before: {} as SessionPlayerStateSnapshot,
						after: {} as SessionPlayerStateSnapshot,
						delta: createDelta(playerId === firstPlayerId ? 9 : 7),
						steps: [],
					},
				}),
			);
			setPlayers([
				createPlayer(1, {
					resources: { [primaryResource]: 11 },
				}),
				createPlayer(2),
			]);
			rerender();
			await waitFor(() => {
				expect(simulateUpcomingPhasesMock).toHaveBeenCalledTimes(2);
				expect(result.current[firstPlayerId]).toEqual(createDelta(9));
				expect(result.current[secondPlayerId]).toEqual(createDelta(7));
			});
		});
	});

	it('recomputes when game state changes without player deltas', () => {
		simulateUpcomingPhasesMock.mockImplementation(({ playerId }) => {
			const deltaAmount = playerId === firstPlayerId ? 4 : 6;
			return Promise.resolve({
				sessionId: engineValue.sessionId,
				result: {
					playerId,
					before: {} as SessionPlayerStateSnapshot,
					after: {} as SessionPlayerStateSnapshot,
					delta: createDelta(deltaAmount),
					steps: [],
				},
			});
		});
		const { result, rerender } = renderHook(() => useNextTurnForecast());
		return waitFor(() => {
			expect(simulateUpcomingPhasesMock).toHaveBeenCalledTimes(2);
			expect(result.current[firstPlayerId]).toEqual(createDelta(4));
			expect(result.current[secondPlayerId]).toEqual(createDelta(6));
		}).then(async () => {
			simulateUpcomingPhasesMock.mockClear();
			setGameState({ turn: engineValue.sessionState.game.turn + 1 });
			rerender();
			await waitFor(() => {
				expect(simulateUpcomingPhasesMock).toHaveBeenCalledTimes(2);
				expect(result.current[firstPlayerId]).toEqual(createDelta(4));
				expect(result.current[secondPlayerId]).toEqual(createDelta(6));
			});
		});
	});

	it('recomputes when land details change without affecting counts', () => {
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
		simulateUpcomingPhasesMock.mockImplementation(({ playerId }) => {
			const deltaAmount = playerId === firstPlayerId ? 2 : 3;
			return Promise.resolve({
				sessionId: engineValue.sessionId,
				result: {
					playerId,
					before: {} as SessionPlayerStateSnapshot,
					after: {} as SessionPlayerStateSnapshot,
					delta: createDelta(deltaAmount),
					steps: [],
				},
			});
		});
		const { result, rerender } = renderHook(() => useNextTurnForecast());
		return waitFor(() => {
			expect(simulateUpcomingPhasesMock).toHaveBeenCalledTimes(2);
			expect(result.current[firstPlayerId]).toEqual(createDelta(2));
			expect(result.current[secondPlayerId]).toEqual(createDelta(3));
		}).then(async () => {
			simulateUpcomingPhasesMock.mockClear();
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
			await waitFor(() => {
				expect(simulateUpcomingPhasesMock).toHaveBeenCalledTimes(2);
				expect(result.current[firstPlayerId]).toEqual(createDelta(2));
				expect(result.current[secondPlayerId]).toEqual(createDelta(3));
			});
		});
	});
});
