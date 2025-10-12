// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import type { PlayerStartConfig } from '@kingdom-builder/protocol';
import type {
	SessionPlayerId,
	SessionSnapshot,
} from '@kingdom-builder/protocol/session';
import { useCompensationLogger } from '../../src/state/useCompensationLogger';
import * as TranslationModule from '../../src/translation';
import type * as TranslationTypes from '../../src/translation';
import type {
	LegacySession,
	SessionResourceKey,
} from '../../src/state/sessionTypes';
import { createSessionRegistries } from '../helpers/sessionRegistries';

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
function resolveResourceKeys(
	registries: ReturnType<typeof createSessionRegistries>,
): SessionResourceKey[] {
	const keys = Object.keys(registries.resources) as SessionResourceKey[];
	if (keys.length === 0) {
		throw new Error('Expected registries to expose at least one resource.');
	}
	return keys;
}

function createSession(resourceKey: SessionResourceKey): LegacySession {
	return {
		hasAiController: () => false,
		getActionDefinition: () => undefined,
		runAiTurn: vi.fn().mockResolvedValue(false),
		advancePhase: vi.fn(),
		pullEffectLog: vi.fn(),
		getPassiveEvaluationMods: vi.fn(() => new Map()),
		getRuleSnapshot: vi.fn(() => ({
			tieredResourceKey: resourceKey,
			tierDefinitions: [],
			winConditions: [],
		})),
		pushEffectLog: vi.fn(),
		applyDeveloperPreset: vi.fn(),
		updatePlayerName: vi.fn(),
	} as unknown as LegacySession;
}

function createPlayer(
	id: SessionPlayerId,
	name: string,
): SessionSnapshot['game']['players'][number] {
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

function createSessionState(
	turn: number,
	resourceKey: SessionResourceKey,
): SessionSnapshot {
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
		actionCostResource: resourceKey,
		recentResourceGains: [],
		compensations: {
			A: {},
			B: {
				resources: { [resourceKey]: 1 },
			},
		} as Record<SessionPlayerId, PlayerStartConfig>,
		rules: {
			tieredResourceKey: resourceKey,
			tierDefinitions: [],
			winConditions: [],
		},
		passiveRecords: {
			A: [],
			B: [],
		},
		metadata: { passiveEvaluationModifiers: {} },
	};
}

function createHarnessSetup() {
	const registries = createSessionRegistries();
	const resourceKeys = resolveResourceKeys(registries);
	const [primaryResource] = resourceKeys;
	return { registries, resourceKeys, primaryResource } as const;
}

interface HarnessProps {
	session: LegacySession;
	state: SessionSnapshot;
	addLog: (entry: string | string[]) => void;
	resourceKeys: SessionResourceKey[];
	registries: ReturnType<typeof createSessionRegistries>;
}

function Harness({
	session,
	state,
	addLog,
	resourceKeys,
	registries,
}: HarnessProps) {
	useCompensationLogger({
		session,
		sessionState: state,
		addLog,
		resourceKeys,
		registries,
	});
	return null;
}

describe('useCompensationLogger', () => {
	it('logs compensation once for a session', () => {
		diffStepSnapshotsMock.mockClear();
		const addLog = vi.fn();
		const { registries, resourceKeys, primaryResource } = createHarnessSetup();
		registries.resources[primaryResource] = { key: primaryResource };
		const session = createSession(primaryResource);
		const state = createSessionState(1, primaryResource);
		const { rerender } = render(
			<Harness
				session={session}
				state={state}
				addLog={addLog}
				resourceKeys={resourceKeys}
				registries={registries}
			/>,
		);
		expect(addLog).toHaveBeenCalledTimes(1);
		expect(diffStepSnapshotsMock).toHaveBeenCalledTimes(1);
		const diffContext = diffStepSnapshotsMock.mock.calls[0]?.[3];
		expect(diffContext?.activePlayer.id).toBe('B');
		expect(diffContext?.assets.resources?.[primaryResource]?.label).toBe(
			primaryResource,
		);
		const nextState = createSessionState(1, primaryResource);
		rerender(
			<Harness
				session={session}
				state={nextState}
				addLog={addLog}
				resourceKeys={resourceKeys}
				registries={registries}
			/>,
		);
		expect(addLog).toHaveBeenCalledTimes(1);
		expect(diffStepSnapshotsMock).toHaveBeenCalledTimes(1);
	});

	it('logs again when a new session starts', () => {
		diffStepSnapshotsMock.mockClear();
		const addLog = vi.fn();
		const { registries, resourceKeys, primaryResource } = createHarnessSetup();
		const session = createSession(primaryResource);
		const state = createSessionState(1, primaryResource);
		const { rerender } = render(
			<Harness
				session={session}
				state={state}
				addLog={addLog}
				resourceKeys={resourceKeys}
				registries={registries}
			/>,
		);
		expect(addLog).toHaveBeenCalledTimes(1);
		expect(diffStepSnapshotsMock).toHaveBeenCalledTimes(1);
		const newSession = createSession(primaryResource);
		const newState = createSessionState(1, primaryResource);
		rerender(
			<Harness
				session={newSession}
				state={newState}
				addLog={addLog}
				resourceKeys={resourceKeys}
				registries={registries}
			/>,
		);
		expect(addLog).toHaveBeenCalledTimes(2);
		expect(diffStepSnapshotsMock).toHaveBeenCalledTimes(2);
		const firstContext = diffStepSnapshotsMock.mock.calls[0]?.[3];
		const secondContext = diffStepSnapshotsMock.mock.calls[1]?.[3];
		expect(firstContext?.activePlayer.id).toBe('B');
		expect(secondContext?.activePlayer.id).toBe('B');
	});
});
