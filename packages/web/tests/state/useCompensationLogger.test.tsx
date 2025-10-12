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
	SessionRegistries,
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

type SessionResourceKey = SessionSnapshot['actionCostResource'];

function createRegistriesContext() {
	const registries = createSessionRegistries();
	const resourceKeys = Object.keys(
		registries.resources,
	) as SessionResourceKey[];
	return {
		registries,
		resourceKeys,
		primaryResource: resourceKeys[0]!,
	};
}

function createSession(primaryResource: SessionResourceKey): LegacySession {
	return {
		hasAiController: () => false,
		getActionDefinition: () => undefined,
		runAiTurn: vi.fn().mockResolvedValue(false),
		advancePhase: vi.fn(),
		pullEffectLog: vi.fn(),
		getPassiveEvaluationMods: vi.fn(() => new Map()),
		getRuleSnapshot: vi.fn(() => ({
			tieredResourceKey: primaryResource,
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
	resourceKey: SessionResourceKey,
): SessionSnapshot['game']['players'][number] {
	return {
		id,
		name,
		resources: { [resourceKey]: 3 },
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
	primaryResource: SessionResourceKey,
	turn: number,
): SessionSnapshot {
	const playerA = createPlayer('A', 'Player A', primaryResource);
	const playerB = createPlayer('B', 'Player B', primaryResource);
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
		actionCostResource: primaryResource,
		recentResourceGains: [],
		compensations: {
			A: {},
			B: {
				resources: { [primaryResource]: 1 },
			},
		} as Record<SessionPlayerId, PlayerStartConfig>,
		rules: {
			tieredResourceKey: primaryResource,
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

interface HarnessProps {
	session: LegacySession;
	state: SessionSnapshot;
	addLog: (entry: string | string[]) => void;
	resourceKeys: SessionResourceKey[];
	registries: Pick<
		SessionRegistries,
		'actions' | 'buildings' | 'developments' | 'populations' | 'resources'
	>;
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
		const { registries, resourceKeys, primaryResource } =
			createRegistriesContext();
		const session = createSession(primaryResource);
		const state = createSessionState(primaryResource, 1);
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
		const nextState = createSessionState(primaryResource, 1);
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
		const {
			registries: initialRegistries,
			resourceKeys,
			primaryResource,
		} = createRegistriesContext();
		const session = createSession(primaryResource);
		const state = createSessionState(primaryResource, 1);
		const { rerender } = render(
			<Harness
				session={session}
				state={state}
				addLog={addLog}
				resourceKeys={resourceKeys}
				registries={initialRegistries}
			/>,
		);
		expect(addLog).toHaveBeenCalledTimes(1);
		expect(diffStepSnapshotsMock).toHaveBeenCalledTimes(1);
		const {
			registries: nextRegistries,
			resourceKeys: nextResourceKeys,
			primaryResource: nextPrimaryResource,
		} = createRegistriesContext();
		const newSession = createSession(nextPrimaryResource);
		const newState = createSessionState(nextPrimaryResource, 1);
		rerender(
			<Harness
				session={newSession}
				state={newState}
				addLog={addLog}
				resourceKeys={nextResourceKeys}
				registries={nextRegistries}
			/>,
		);
		expect(addLog).toHaveBeenCalledTimes(2);
		expect(diffStepSnapshotsMock).toHaveBeenCalledTimes(2);
		const firstContext = diffStepSnapshotsMock.mock.calls[0]?.[3];
		const secondContext = diffStepSnapshotsMock.mock.calls[1]?.[3];
		expect(firstContext?.activePlayer.id).toBe('B');
		expect(secondContext?.activePlayer.id).toBe('B');
	});

	it('falls back to resource ids when metadata is missing', () => {
		diffStepSnapshotsMock.mockClear();
		const addLog = vi.fn();
		const { registries, resourceKeys, primaryResource } =
			createRegistriesContext();
		registries.resources[primaryResource] = { key: primaryResource };
		const session = createSession(primaryResource);
		const state = createSessionState(primaryResource, 1);
		render(
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
		expect(diffContext?.assets.resources[primaryResource]?.label).toBe(
			primaryResource,
		);
		expect(
			diffContext?.assets.resources[primaryResource]?.icon,
		).toBeUndefined();
	});
});
