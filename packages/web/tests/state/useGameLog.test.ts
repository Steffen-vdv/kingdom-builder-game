/** @vitest-environment jsdom */
import { describe, expect, it } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import type {
	SessionPlayerStateSnapshot,
	SessionSnapshot,
} from '@kingdom-builder/protocol/session';
import { MAX_LOG_ENTRIES, useGameLog } from '../../src/state/useGameLog';
import type { ActionResolution } from '../../src/state/useActionResolution';

const primaryResource = 'resource.primary';

const createPlayer = (id: string): SessionPlayerStateSnapshot => ({
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

const createSessionState = (
	players: SessionPlayerStateSnapshot[],
): SessionSnapshot => ({
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
});

describe('useGameLog', () => {
	it('preserves incrementing ids when trimming overflowing log entries', () => {
		const players: SessionPlayerStateSnapshot[] = [
			createPlayer('A'),
			createPlayer('B'),
		];
		const sessionState = createSessionState(players);
		const { result } = renderHook(() =>
			useGameLog({ sessionSnapshot: sessionState }),
		);

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

	it('captures full resolution snapshots when logging resolutions', () => {
		const players: SessionPlayerStateSnapshot[] = [
			createPlayer('A'),
			createPlayer('B'),
		];
		const sessionState = createSessionState(players);
		const { result } = renderHook(() =>
			useGameLog({ sessionSnapshot: sessionState }),
		);
		const resolution: ActionResolution = {
			lines: ['Perform Attack', 'Deal 2 damage'],
			visibleLines: ['Perform Attack'],
			timeline: [
				{ text: 'Perform Attack', depth: 0, kind: 'headline' },
				{ text: 'Deal 2 damage', depth: 1, kind: 'effect' },
			],
			visibleTimeline: [{ text: 'Perform Attack', depth: 0, kind: 'headline' }],
			isComplete: false,
			summaries: ['Attack summary'],
			source: 'action',
			requireAcknowledgement: true,
		};

		act(() => {
			result.current.addResolutionLog(resolution, players[0]);
		});

		expect(resolution.isComplete).toBe(false);
		expect(resolution.requireAcknowledgement).toBe(true);
		expect(resolution.visibleLines).toEqual(['Perform Attack']);
		expect(resolution.visibleTimeline).toHaveLength(1);

		const [entry] = result.current.log;
		expect(entry?.kind).toBe('resolution');
		if (entry?.kind !== 'resolution') {
			throw new Error('Expected resolution log entry');
		}
		expect(entry.playerId).toBe(players[0]!.id);
		expect(entry.resolution).not.toBe(resolution);
		expect(entry.resolution.lines).toEqual(resolution.lines);
		expect(entry.resolution.lines).not.toBe(resolution.lines);
		expect(entry.resolution.visibleLines).toEqual(resolution.lines);
		expect(entry.resolution.timeline).toEqual(resolution.timeline);
		expect(entry.resolution.timeline).not.toBe(resolution.timeline);
		expect(entry.resolution.visibleTimeline).toEqual(resolution.timeline);
		expect(entry.resolution.summaries).toEqual(resolution.summaries);
		expect(entry.resolution.summaries).not.toBe(resolution.summaries);
		expect(entry.resolution.isComplete).toBe(true);
		expect(entry.resolution.requireAcknowledgement).toBe(false);
		expect(entry.resolution.player).toEqual(players[0]);
	});

	it('merges sequential phase resolutions into a single log entry', () => {
		const players: SessionPlayerStateSnapshot[] = [
			createPlayer('A'),
			createPlayer('B'),
		];
		const sessionState = createSessionState(players);
		const { result } = renderHook(() =>
			useGameLog({ sessionSnapshot: sessionState }),
		);
		const phaseSource = {
			kind: 'phase' as const,
			label: 'Growth Phase',
			id: 'growth',
		};
		const firstResolution: ActionResolution = {
			lines: ['Growth Phase', '    Gain 2 gold'],
			visibleLines: ['Growth Phase', '    Gain 2 gold'],
			timeline: [
				{ text: 'Growth Phase', depth: 0, kind: 'headline' },
				{ text: 'Gain 2 gold', depth: 1, kind: 'effect' },
			],
			visibleTimeline: [
				{ text: 'Growth Phase', depth: 0, kind: 'headline' },
				{ text: 'Gain 2 gold', depth: 1, kind: 'effect' },
			],
			isComplete: true,
			summaries: ['Gain 2 gold'],
			source: phaseSource,
			requireAcknowledgement: false,
		};
		act(() => {
			result.current.addResolutionLog(firstResolution, players[0]);
		});
		expect(result.current.log).toHaveLength(1);
		const secondResolution: ActionResolution = {
			lines: ['Growth Phase', '    Gain 2 gold', '    Draw 1 card'],
			visibleLines: ['Growth Phase', '    Gain 2 gold', '    Draw 1 card'],
			timeline: [
				{ text: 'Growth Phase', depth: 0, kind: 'headline' },
				{ text: 'Gain 2 gold', depth: 1, kind: 'effect' },
				{ text: 'Draw 1 card', depth: 1, kind: 'effect' },
			],
			visibleTimeline: [
				{ text: 'Growth Phase', depth: 0, kind: 'headline' },
				{ text: 'Gain 2 gold', depth: 1, kind: 'effect' },
				{ text: 'Draw 1 card', depth: 1, kind: 'effect' },
			],
			isComplete: true,
			summaries: ['Gain 2 gold', 'Draw 1 card'],
			source: phaseSource,
			requireAcknowledgement: false,
		};
		act(() => {
			result.current.addResolutionLog(secondResolution, players[0]);
		});
		expect(result.current.log).toHaveLength(1);
		const [entry] = result.current.log;
		expect(entry?.kind).toBe('resolution');
		if (entry?.kind !== 'resolution') {
			throw new Error('Expected resolution log entry');
		}
		expect(entry.id).toBe(0);
		expect(entry.playerId).toBe(players[0]!.id);
		expect(entry.resolution.lines).toEqual(secondResolution.lines);
		expect(entry.resolution.summaries).toEqual(secondResolution.summaries);
	});
});
