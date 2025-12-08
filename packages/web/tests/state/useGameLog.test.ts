/** @vitest-environment jsdom */
import { describe, expect, it } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import type {
	SessionPlayerStateSnapshot,
	SessionSnapshot,
} from '@kingdom-builder/protocol/session';
import { createEmptySnapshotMetadata } from '../helpers/sessionFixtures';
import { MAX_LOG_ENTRIES, useGameLog } from '../../src/state/useGameLog';
import type { ActionResolution } from '../../src/state/useActionResolution';

const primaryResource = 'resource.primary';

const createPlayer = (id: string): SessionPlayerStateSnapshot => ({
	id,
	name: `Player ${id}`,
	resources: { [primaryResource]: 0 },
	stats: {},
	resourceTouched: {},
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
	resourceSources: {},
	skipPhases: {},
	skipSteps: {},
	passives: [],
});

describe('useGameLog', () => {
	it('preserves incrementing ids when trimming overflowing log entries', () => {
		const players: SessionPlayerStateSnapshot[] = [
			createPlayer('A'),
			createPlayer('B'),
		];
		const sessionState: SessionSnapshot = {
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
			metadata: createEmptySnapshotMetadata(),
		};
		const { result } = renderHook(() =>
			useGameLog({ sessionSnapshot: sessionState }),
		);

		const createResolution = (message: string): ActionResolution => ({
			lines: [message],
			visibleLines: [],
			timeline: [],
			visibleTimeline: [],
			isComplete: false,
			summaries: [],
			source: 'action',
			requireAcknowledgement: false,
		});

		act(() => {
			result.current.addResolutionLog(
				createResolution('Initial entry'),
				players[0],
			);
		});
		expect(result.current.log[0]?.id).toBe(0);

		act(() => {
			for (let index = 1; index <= MAX_LOG_ENTRIES; index += 1) {
				result.current.addResolutionLog(
					createResolution(`Message ${index}`),
					players[index % players.length],
				);
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
			result.current.addResolutionLog(
				createResolution('Overflow entry'),
				players[0],
			);
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
		const sessionState: SessionSnapshot = {
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
			metadata: createEmptySnapshotMetadata(),
		};
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

	it('merges sequential phase resolution updates into a single log entry', () => {
		const players: SessionPlayerStateSnapshot[] = [
			createPlayer('A'),
			createPlayer('B'),
		];
		const sessionState: SessionSnapshot = {
			game: {
				turn: 1,
				currentPlayerIndex: 0,
				currentPhase: 'growth',
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
			metadata: createEmptySnapshotMetadata(),
		};
		const { result } = renderHook(() =>
			useGameLog({ sessionSnapshot: sessionState }),
		);
		const source = {
			kind: 'phase' as const,
			label: 'Growth Phase',
			id: 'growth',
		};
		const firstResolution: ActionResolution = {
			lines: ['Growth Phase', '    🪙 Gold +2'],
			visibleLines: ['Growth Phase', '    🪙 Gold +2'],
			timeline: [
				{ text: 'Growth Phase', depth: 0, kind: 'headline' },
				{ text: '🪙 Gold +2', depth: 1, kind: 'effect' },
			],
			visibleTimeline: [
				{ text: 'Growth Phase', depth: 0, kind: 'headline' },
				{ text: '🪙 Gold +2', depth: 1, kind: 'effect' },
			],
			isComplete: true,
			summaries: ['🪙 Gold +2'],
			source,
			requireAcknowledgement: false,
		};
		const secondResolution: ActionResolution = {
			lines: ['Growth Phase', '    🪙 Gold +2', '    ⚔️ Army Strength +1'],
			visibleLines: [
				'Growth Phase',
				'    🪙 Gold +2',
				'    ⚔️ Army Strength +1',
			],
			timeline: [
				{ text: 'Growth Phase', depth: 0, kind: 'headline' },
				{ text: '🪙 Gold +2', depth: 1, kind: 'effect' },
				{ text: '⚔️ Army Strength +1', depth: 1, kind: 'effect' },
			],
			visibleTimeline: [
				{ text: 'Growth Phase', depth: 0, kind: 'headline' },
				{ text: '🪙 Gold +2', depth: 1, kind: 'effect' },
				{ text: '⚔️ Army Strength +1', depth: 1, kind: 'effect' },
			],
			isComplete: true,
			summaries: ['🪙 Gold +2', '⚔️ Army Strength +1'],
			source,
			requireAcknowledgement: false,
		};

		act(() => {
			result.current.addResolutionLog(firstResolution, players[0]);
		});
		act(() => {
			result.current.addResolutionLog(secondResolution, players[0]);
		});

		expect(result.current.log).toHaveLength(1);
		const [entry] = result.current.log;
		expect(entry?.kind).toBe('resolution');
		if (entry?.kind !== 'resolution') {
			throw new Error('Expected a resolution log entry');
		}
		expect(entry.resolution.lines).toEqual(secondResolution.lines);
		expect(entry.resolution.lines).not.toBe(secondResolution.lines);
		expect(entry.resolution.timeline).toEqual(secondResolution.timeline);
		expect(entry.resolution.timeline).not.toBe(secondResolution.timeline);
	});
});
