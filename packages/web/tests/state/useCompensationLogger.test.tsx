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
import type * as TranslationModule from '../../src/translation';

vi.mock('../../src/translation', async () => {
	const actual = await vi.importActual<TranslationModule>(
		'../../src/translation',
	);
	return {
		...actual,
		diffStepSnapshots: vi.fn(() => ['+1 gold']),
	};
});

const RESOURCE_KEYS: ResourceKey[] = ['gold' as ResourceKey];

function createSession(): EngineSession {
	return {
		getPassiveEvaluationMods() {
			return new Map();
		},
		pullEffectLog: vi.fn(),
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
		const addLog = vi.fn();
		const session = createSession();
		const state = createSessionState(1);
		const { rerender } = render(
			<Harness session={session} state={state} addLog={addLog} />,
		);
		expect(addLog).toHaveBeenCalledTimes(1);
		const nextState = createSessionState(1);
		rerender(<Harness session={session} state={nextState} addLog={addLog} />);
		expect(addLog).toHaveBeenCalledTimes(1);
	});

	it('logs again when a new session starts', () => {
		const addLog = vi.fn();
		const session = createSession();
		const state = createSessionState(1);
		const { rerender } = render(
			<Harness session={session} state={state} addLog={addLog} />,
		);
		expect(addLog).toHaveBeenCalledTimes(1);
		const newSession = createSession();
		const newState = createSessionState(1);
		rerender(<Harness session={newSession} state={newState} addLog={addLog} />);
		expect(addLog).toHaveBeenCalledTimes(2);
	});
});
