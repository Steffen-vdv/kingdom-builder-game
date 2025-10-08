// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import {
	type EngineSession,
	type EngineSessionSnapshot,
	type PlayerId,
} from '@kingdom-builder/engine';
import { type PlayerStartConfig } from '@kingdom-builder/protocol';
import { type ResourceKey } from '@kingdom-builder/contents';
import { useCompensationLogger } from '../../src/state/useCompensationLogger';
import * as TranslationModule from '../../src/translation';
import type * as TranslationTypes from '../../src/translation';

vi.mock('../../src/translation', async () => {
	const actual = await vi.importActual<TranslationTypes>(
		'../../src/translation',
	);
	return {
		...actual,
		diffStepSnapshots: vi.fn(() => ['+1 gold']),
	};
});

const diffStepSnapshotsMock = vi.mocked(TranslationModule.diffStepSnapshots);

const RESOURCE_KEYS: ResourceKey[] = ['gold' as ResourceKey];

function createSession(): EngineSession {
	return {
		hasAiController: () => false,
		getActionDefinition: () => undefined,
		runAiTurn: vi.fn().mockResolvedValue(false),
		advancePhase: vi.fn(),
		pullEffectLog: vi.fn(),
		getPassiveEvaluationMods: vi.fn(() => new Map()),
		getLegacyContext() {
			return {
				activePlayer: {
					id: 'A',
					lands: [],
					buildings: [],
					resources: {},
					stats: {},
				},
				buildings: {
					get() {
						return { icon: '', name: '' };
					},
				},
				developments: {
					get() {
						return { icon: '', name: '' };
					},
				},
				passives: {
					list() {
						return [];
					},
				},
			} as unknown as EngineSession['getLegacyContext'] extends () => infer R
				? R
				: never;
		},
	} as unknown as EngineSession;
}

function createPlayer(
	id: PlayerId,
	name: string,
): EngineSessionSnapshot['game']['players'][number] {
	return {
		id,
		name,
		resources: { gold: 3 },
		stats: {},
		statsHistory: {},
		population: {},
		lands: [],
		buildings: [],
		actions: [],
		statSources: {},
		skipPhases: {},
		skipSteps: {},
		passives: [],
	};
}

function createSessionState(turn: number): EngineSessionSnapshot {
	const playerA = createPlayer('A', 'Player A');
	const playerB = createPlayer('B', 'Player B');
	return {
		game: {
			turn,
			currentPlayerIndex: 0,
			currentPhase: 'phase',
			currentStep: 'step',
			phaseIndex: 0,
			stepIndex: 0,
			devMode: false,
			players: [playerA, playerB],
			activePlayerId: 'A',
			opponentId: 'B',
		},
		phases: [],
		actionCostResource: RESOURCE_KEYS[0]!,
		recentResourceGains: [],
		compensations: {
			A: {},
			B: {
				resources: { gold: 1 },
			},
		} as Record<PlayerId, PlayerStartConfig>,
	};
}

interface HarnessProps {
	session: EngineSession;
	state: EngineSessionSnapshot;
	addLog: (entry: string | string[]) => void;
}

function Harness({ session, state, addLog }: HarnessProps) {
	useCompensationLogger({
		session,
		sessionState: state,
		addLog,
		resourceKeys: RESOURCE_KEYS,
	});
	return null;
}

describe('useCompensationLogger', () => {
	it('logs compensation once for a session', () => {
		diffStepSnapshotsMock.mockClear();
		const addLog = vi.fn();
		const session = createSession();
		const state = createSessionState(1);
		const { rerender } = render(
			<Harness session={session} state={state} addLog={addLog} />,
		);
		expect(addLog).toHaveBeenCalledTimes(1);
		expect(diffStepSnapshotsMock).toHaveBeenCalledTimes(1);
		const diffContext = diffStepSnapshotsMock.mock.calls[0]?.[3];
		expect(diffContext?.activePlayer.id).toBe('B');
		const nextState = createSessionState(1);
		rerender(<Harness session={session} state={nextState} addLog={addLog} />);
		expect(addLog).toHaveBeenCalledTimes(1);
		expect(diffStepSnapshotsMock).toHaveBeenCalledTimes(1);
	});

	it('logs again when a new session starts', () => {
		diffStepSnapshotsMock.mockClear();
		const addLog = vi.fn();
		const session = createSession();
		const state = createSessionState(1);
		const { rerender } = render(
			<Harness session={session} state={state} addLog={addLog} />,
		);
		expect(addLog).toHaveBeenCalledTimes(1);
		expect(diffStepSnapshotsMock).toHaveBeenCalledTimes(1);
		const newSession = createSession();
		const newState = createSessionState(1);
		rerender(<Harness session={newSession} state={newState} addLog={addLog} />);
		expect(addLog).toHaveBeenCalledTimes(2);
		expect(diffStepSnapshotsMock).toHaveBeenCalledTimes(2);
		const firstContext = diffStepSnapshotsMock.mock.calls[0]?.[3];
		const secondContext = diffStepSnapshotsMock.mock.calls[1]?.[3];
		expect(firstContext?.activePlayer.id).toBe('B');
		expect(secondContext?.activePlayer.id).toBe('B');
	});
});
