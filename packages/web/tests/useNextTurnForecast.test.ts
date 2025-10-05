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
import type {
	PlayerSnapshotDeltaBucket,
	PlayerStateSnapshot,
} from '@kingdom-builder/engine';
import { useNextTurnForecast } from '../src/state/useNextTurnForecast';

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
	sessionState: { game: { players: PlayerStateSnapshot[] } };
}

const contextStub = { context: true } as const;
const engineValue: MockGameEngine = {
	session: { getLegacyContext: vi.fn(() => contextStub) },
	sessionState: { game: { players: [] } },
};

vi.mock('../src/state/GameContext', () => ({
	useGameEngine: (): MockGameEngine => engineValue,
}));

const resourceKeys = Object.keys(RESOURCES) as ResourceKey[];
const statKeys = Object.keys(STATS) as StatKey[];
const populationKeys = Object.keys(POPULATIONS) as PopulationRoleId[];
const primaryResource = resourceKeys[0]!;
const primaryStat = statKeys[0]!;
const primaryPopulation = populationKeys[0]!;

function createPlayer(
	index: number,
	overrides: Partial<PlayerStateSnapshot> = {},
): PlayerStateSnapshot {
	const baseResources: Record<string, number> = {
		[primaryResource]: index,
	};
	const baseStats: Record<string, number> = {
		[primaryStat]: index * 2,
	};
	const basePopulation: Record<string, number> = {
		[primaryPopulation]: index,
	};
	const {
		resources: overrideResources,
		stats: overrideStats,
		population: overridePopulation,
		...restOverrides
	} = overrides;
	return {
		id: `player-${index}`,
		name: `Player ${index}`,
		resources: { ...baseResources, ...(overrideResources ?? {}) },
		stats: { ...baseStats, ...(overrideStats ?? {}) },
		population: {
			...basePopulation,
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

function setPlayers(players: PlayerStateSnapshot[]) {
	engineValue.sessionState = { game: { players } };
}

function createDelta(amount: number): PlayerSnapshotDeltaBucket {
	return {
		resources: { [primaryResource]: amount },
		stats: { [primaryStat]: amount * 2 },
		population: { [primaryPopulation]: amount },
	};
}

describe('useNextTurnForecast', () => {
	const firstPlayerId = createPlayer(1).id;
	const secondPlayerId = createPlayer(2).id;

	beforeEach(() => {
		simulateUpcomingPhasesMock.mockReset();
		engineValue.session.getLegacyContext.mockClear();
		setPlayers([createPlayer(1), createPlayer(2)]);
	});

	it('returns per-player forecast data and memoizes stable hashes', () => {
		simulateUpcomingPhasesMock.mockImplementation((_, playerId: string) => ({
			playerId,
			before: {} as PlayerStateSnapshot,
			after: {} as PlayerStateSnapshot,
			delta: createDelta(playerId === firstPlayerId ? 3 : 5),
			steps: [],
		}));
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

	it('returns empty buckets on simulation failure and recomputes on hash change', () => {
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
});
