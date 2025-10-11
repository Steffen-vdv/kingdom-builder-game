/** @vitest-environment jsdom */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { advanceToActionPhase } from '../../src/state/usePhaseProgress.helpers';
import { SessionMirroringError } from '../../src/state/sessionSdk';
import {
	createSessionSnapshot,
	createSnapshotPlayer,
} from '../helpers/sessionFixtures';
import {
	createResourceKeys,
	createSessionRegistries,
} from '../helpers/sessionRegistries';
import type { LegacySession } from '../../src/state/sessionTypes';
import type * as SessionSdk from '../../src/state/sessionSdk';

const snapshotPlayerMock = vi.hoisted(() => vi.fn((player) => player));
const getLegacySessionContextMock = vi.hoisted(() =>
	vi.fn(() => ({
		diffContext: {},
		translationContext: {
			actions: new Map(),
		},
	})),
);
const advanceSessionPhaseMock = vi.hoisted(() => vi.fn());

vi.mock('../../src/translation', () => ({
	snapshotPlayer: snapshotPlayerMock,
}));

vi.mock('../../src/state/getLegacySessionContext', () => ({
	getLegacySessionContext: getLegacySessionContextMock,
}));

vi.mock('../../src/state/sessionSdk', async () => {
	const actual = await vi.importActual<SessionSdk>(
		'../../src/state/sessionSdk',
	);
	return {
		...actual,
		advanceSessionPhase: advanceSessionPhaseMock,
	};
});

describe('advanceToActionPhase', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		advanceSessionPhaseMock.mockReset();
		snapshotPlayerMock.mockReset();
		snapshotPlayerMock.mockImplementation((player) => player);
		getLegacySessionContextMock.mockReset();
		getLegacySessionContextMock.mockImplementation(() => ({
			diffContext: {},
			translationContext: {
				actions: new Map(),
			},
		}));
	});

	it('invokes fatal handler when local phase mirroring fails', async () => {
		const [resourceKey] = createResourceKeys();
		if (!resourceKey) {
			throw new Error('RESOURCE_KEYS is empty');
		}
		const player = createSnapshotPlayer({
			id: 'player-1',
			name: 'Hero',
			resources: { [resourceKey]: 0 },
		});
		const snapshot = createSessionSnapshot({
			players: [player],
			activePlayerId: player.id,
			opponentId: player.id,
			phases: [
				{ id: 'phase-growth', name: 'Growth', action: false, steps: [] },
				{ id: 'phase-main', name: 'Main', action: true, steps: [] },
			],
			actionCostResource: resourceKey,
			ruleSnapshot: {
				tieredResourceKey: resourceKey,
				tierDefinitions: [],
				winConditions: [],
			},
			turn: 1,
			currentPhase: 'phase-growth',
			currentStep: 'phase-growth',
		});
		const getSnapshot = vi.fn(() => snapshot);
		const session = { getSnapshot } as unknown as LegacySession;
		const applyPhaseSnapshot = vi.fn();
		const refresh = vi.fn();
		const formatPhaseResolution = vi.fn(() => ({
			lines: [],
			summaries: [],
			source: {
				kind: 'phase',
				label: 'Phase',
				id: 'phase-main',
			},
		}));
		const showResolution = vi.fn().mockResolvedValue(undefined);
		const onFatalSessionError = vi.fn();
		const mirroringError = new SessionMirroringError('Mirror failed', {
			sessionId: 'session-1',
		});
		advanceSessionPhaseMock.mockRejectedValueOnce(mirroringError);

		await advanceToActionPhase({
			session,
			sessionId: 'session-1',
			resourceKeys: [resourceKey],
			mountedRef: { current: true },
			applyPhaseSnapshot,
			refresh,
			formatPhaseResolution,
			showResolution,
			registries: createSessionRegistries(),
			onFatalSessionError,
		});

		expect(onFatalSessionError).toHaveBeenCalledWith(mirroringError);
		expect(applyPhaseSnapshot).toHaveBeenNthCalledWith(1, snapshot, {
			isAdvancing: true,
			canEndTurn: false,
		});
		expect(applyPhaseSnapshot).toHaveBeenNthCalledWith(2, snapshot, {
			isAdvancing: false,
			canEndTurn: false,
		});
		expect(showResolution).not.toHaveBeenCalled();
		expect(refresh).not.toHaveBeenCalled();
		expect(advanceSessionPhaseMock).toHaveBeenCalledWith({
			sessionId: 'session-1',
		});
	});
});
