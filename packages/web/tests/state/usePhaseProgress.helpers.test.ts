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
import { createLegacySessionMock } from '../helpers/createLegacySessionMock';

const advanceSessionPhaseMock = vi.hoisted(() => vi.fn());

vi.mock('../../src/state/sessionSdk', async () => {
	const actual = await vi.importActual('../../src/state/sessionSdk');
	return {
		...(actual as Record<string, unknown>),
		advanceSessionPhase: advanceSessionPhaseMock,
	};
});

describe('advanceToActionPhase', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		advanceSessionPhaseMock.mockReset();
	});

	it('forwards mirroring failures to the fatal handler', async () => {
		const [actionCostResource] = createResourceKeys();
		if (!actionCostResource) {
			throw new Error('RESOURCE_KEYS is empty');
		}
		const phases = [
			{ id: 'phase-setup', name: 'Setup', action: false, steps: [] },
			{ id: 'phase-main', name: 'Main', action: true, steps: [] },
		];
		const player = createSnapshotPlayer({ id: 'player-1' });
		const opponent = createSnapshotPlayer({ id: 'player-2' });
		const snapshot = createSessionSnapshot({
			players: [player, opponent],
			activePlayerId: player.id,
			opponentId: opponent.id,
			phases,
			actionCostResource,
			ruleSnapshot: {
				tieredResourceKey: actionCostResource,
				tierDefinitions: [],
				winConditions: [],
			},
			turn: 1,
			currentPhase: phases[0]?.id ?? 'phase-setup',
			currentStep: phases[0]?.id ?? 'phase-setup',
		});
		const session = createLegacySessionMock({ snapshot });
		const mountedRef = { current: true };
		const applyPhaseSnapshot = vi.fn();
		const refresh = vi.fn();
		const formatPhaseResolution = vi.fn();
		const showResolution = vi.fn();
		const registries = createSessionRegistries();
		const fatalError = new SessionMirroringError('Mirroring failed', {
			cause: new Error('desync'),
		});
		advanceSessionPhaseMock.mockRejectedValueOnce(fatalError);
		const onFatalSessionError = vi.fn();

		await expect(
			advanceToActionPhase({
				session: session as never,
				sessionId: 'session-1',
				resourceKeys: [actionCostResource],
				mountedRef,
				applyPhaseSnapshot,
				refresh,
				formatPhaseResolution: formatPhaseResolution as never,
				showResolution: showResolution as never,
				registries,
				onFatalSessionError,
			}),
		).resolves.toBeUndefined();

		expect(onFatalSessionError).toHaveBeenCalledWith(fatalError);
		expect(advanceSessionPhaseMock).toHaveBeenCalledWith({
			sessionId: 'session-1',
		});
	});
});
