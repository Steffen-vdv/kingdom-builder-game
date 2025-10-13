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
import type { SessionResourceKey } from '../../src/state/sessionTypes';
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

function createRegistriesWithFallback() {
	const registries = createSessionRegistries();
	const [primaryResource] = Object.keys(
		registries.resources,
	) as SessionResourceKey[];
	if (primaryResource) {
		registries.resources[primaryResource] = { key: primaryResource };
	}
	const resourceKeys: SessionResourceKey[] = primaryResource
		? [primaryResource]
		: [];
	return { registries, resourceKeys, primaryResource } as const;
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
	turn: number,
	resourceKey: SessionResourceKey,
): SessionSnapshot {
	const playerA = createPlayer('A', 'Player A', resourceKey);
	const playerB = createPlayer('B', 'Player B', resourceKey);
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

interface HarnessProps {
	sessionId: string;
	state: SessionSnapshot;
	addLog: (entry: string | string[]) => void;
	registries: ReturnType<typeof createSessionRegistries>;
	resourceKeys: SessionResourceKey[];
}

function Harness({
	sessionId,
	state,
	addLog,
	registries,
	resourceKeys,
}: HarnessProps) {
	useCompensationLogger({
		sessionId,
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
			createRegistriesWithFallback();
		const resourceKey =
			resourceKeys[0] ?? ('resource-fallback' as SessionResourceKey);
		const sessionId = 'session-primary';
		const state = createSessionState(1, resourceKey);
		const { rerender } = render(
			<Harness
				sessionId={sessionId}
				state={state}
				addLog={addLog}
				registries={registries}
				resourceKeys={resourceKeys}
			/>,
		);
		expect(addLog).toHaveBeenCalledTimes(1);
		expect(diffStepSnapshotsMock).toHaveBeenCalledTimes(1);
		const diffContext = diffStepSnapshotsMock.mock.calls[0]?.[3];
		expect(diffContext?.activePlayer.id).toBe('B');
		if (primaryResource) {
			const resourceDescriptor = diffContext?.assets.resources[primaryResource];
			expect(resourceDescriptor?.label).toBe(primaryResource);
		}
		const nextState = createSessionState(1, resourceKey);
		rerender(
			<Harness
				sessionId={sessionId}
				state={nextState}
				addLog={addLog}
				registries={registries}
				resourceKeys={resourceKeys}
			/>,
		);
		expect(addLog).toHaveBeenCalledTimes(1);
		expect(diffStepSnapshotsMock).toHaveBeenCalledTimes(1);
	});

	it('logs again when a new session starts', () => {
		diffStepSnapshotsMock.mockClear();
		const addLog = vi.fn();
		const { registries, resourceKeys } = createRegistriesWithFallback();
		const resourceKey =
			resourceKeys[0] ?? ('resource-fallback' as SessionResourceKey);
		const sessionId = 'session-original';
		const state = createSessionState(1, resourceKey);
		const { rerender } = render(
			<Harness
				sessionId={sessionId}
				state={state}
				addLog={addLog}
				registries={registries}
				resourceKeys={resourceKeys}
			/>,
		);
		expect(addLog).toHaveBeenCalledTimes(1);
		expect(diffStepSnapshotsMock).toHaveBeenCalledTimes(1);
		const newSessionId = 'session-new';
		const newState = createSessionState(1, resourceKey);
		rerender(
			<Harness
				sessionId={newSessionId}
				state={newState}
				addLog={addLog}
				registries={registries}
				resourceKeys={resourceKeys}
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
