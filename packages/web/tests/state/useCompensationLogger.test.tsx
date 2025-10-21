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
import type { ActionResolution } from '../../src/state/useActionResolution';
import { createSessionRegistries } from '../helpers/sessionRegistries';
import { createEmptySnapshotMetadata } from '../helpers/sessionFixtures';

vi.mock('../../src/translation', async () => {
	const actual = await vi.importActual<TranslationTypes>(
		'../../src/translation',
	);
	return {
		...actual,
		diffStepSnapshots: vi.fn(() => ({
			tree: [{ summary: '+1 gold' }],
			summaries: ['+1 gold'],
		})),
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
		metadata: createEmptySnapshotMetadata(),
	};
}

interface HarnessProps {
	sessionId: string;
	state: SessionSnapshot;
	addResolutionLog: (resolution: ActionResolution) => void;
	registries: ReturnType<typeof createSessionRegistries>;
	resourceKeys: SessionResourceKey[];
}

function Harness({
	sessionId,
	state,
	addResolutionLog,
	registries,
	resourceKeys,
}: HarnessProps) {
	useCompensationLogger({
		sessionId,
		sessionSnapshot: state,
		addResolutionLog,
		resourceKeys,
		registries,
	});
	return null;
}

describe('useCompensationLogger', () => {
	it('logs compensation once for a session', () => {
		diffStepSnapshotsMock.mockClear();
		const addResolutionLog = vi.fn();
		const { registries, resourceKeys, primaryResource } =
			createRegistriesWithFallback();
		const resourceKey =
			resourceKeys[0] ?? ('resource-fallback' as SessionResourceKey);
		const sessionId = 'session:test';
		const state = createSessionState(1, resourceKey);
		const { rerender } = render(
			<Harness
				sessionId={sessionId}
				state={state}
				addResolutionLog={addResolutionLog}
				registries={registries}
				resourceKeys={resourceKeys}
			/>,
		);
		expect(addResolutionLog).toHaveBeenCalledTimes(1);
		const snapshot = addResolutionLog.mock.calls[0]?.[0];
		expect(snapshot?.lines).toEqual(['Last-player compensation', '• +1 gold']);
		expect(snapshot?.summaries).toEqual(['+1 gold']);
		expect(snapshot?.timeline).toEqual([
			{ text: 'Last-player compensation', depth: 0, kind: 'headline' },
			{ text: '+1 gold', depth: 1, kind: 'effect' },
		]);
		expect(snapshot?.source).toEqual({
			kind: 'phase',
			label: 'Compensation',
			name: 'Compensation',
		});
		expect(snapshot?.player).toEqual({
			id: 'B',
			name: 'Player B',
		});
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
				addResolutionLog={addResolutionLog}
				registries={registries}
				resourceKeys={resourceKeys}
			/>,
		);
		expect(addResolutionLog).toHaveBeenCalledTimes(1);
		expect(diffStepSnapshotsMock).toHaveBeenCalledTimes(1);
	});

	it('logs again when a new session starts', () => {
		diffStepSnapshotsMock.mockClear();
		const addResolutionLog = vi.fn();
		const { registries, resourceKeys } = createRegistriesWithFallback();
		const resourceKey =
			resourceKeys[0] ?? ('resource-fallback' as SessionResourceKey);
		const sessionId = 'session:test';
		const state = createSessionState(1, resourceKey);
		const { rerender } = render(
			<Harness
				sessionId={sessionId}
				state={state}
				addResolutionLog={addResolutionLog}
				registries={registries}
				resourceKeys={resourceKeys}
			/>,
		);
		expect(addResolutionLog).toHaveBeenCalledTimes(1);
		expect(diffStepSnapshotsMock).toHaveBeenCalledTimes(1);
		const nextSessionId = 'session:next';
		const newState = createSessionState(1, resourceKey);
		rerender(
			<Harness
				sessionId={nextSessionId}
				state={newState}
				addResolutionLog={addResolutionLog}
				registries={registries}
				resourceKeys={resourceKeys}
			/>,
		);
		expect(addResolutionLog).toHaveBeenCalledTimes(2);
		expect(diffStepSnapshotsMock).toHaveBeenCalledTimes(2);
		const firstContext = diffStepSnapshotsMock.mock.calls[0]?.[3];
		const secondContext = diffStepSnapshotsMock.mock.calls[1]?.[3];
		expect(firstContext?.activePlayer.id).toBe('B');
		expect(secondContext?.activePlayer.id).toBe('B');
	});
});
