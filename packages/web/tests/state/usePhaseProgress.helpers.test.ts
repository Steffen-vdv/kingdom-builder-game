/** @vitest-environment jsdom */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { advanceToActionPhase } from '../../src/state/usePhaseProgress.helpers';
import {
	createSessionSnapshot,
	createSnapshotPlayer,
} from '../helpers/sessionFixtures';
import {
	createResourceKeys,
	createSessionRegistries,
} from '../helpers/sessionRegistries';
import type { LegacySession } from '../../src/state/sessionTypes';

const advanceSessionPhaseMock = vi.hoisted(() => vi.fn());
const SessionMirroringErrorMock = vi.hoisted(
	() =>
		class SessionMirroringError extends Error {
			constructor(message?: string) {
				super(message);
				this.name = 'SessionMirroringError';
			}
		},
);

vi.mock('../../src/state/sessionSdk', () => ({
	advanceSessionPhase: advanceSessionPhaseMock,
	SessionMirroringError: SessionMirroringErrorMock,
}));

describe('advanceToActionPhase', () => {
	const [actionCostResource] = createResourceKeys();
	if (!actionCostResource) {
		throw new Error('RESOURCE_KEYS is empty');
	}
	const phases = [
		{ id: 'phase-upkeep', name: 'Upkeep', action: false, steps: [] },
		{ id: 'phase-main', name: 'Main', action: true, steps: [] },
	];
	const ruleSnapshot = {
		tieredResourceKey: actionCostResource,
		tierDefinitions: [],
		winConditions: [],
	} as const;
	const player = createSnapshotPlayer({
		id: 'player-1',
		name: 'Hero',
		resources: { [actionCostResource]: 1 },
	});
	let session: LegacySession;
	let applyPhaseSnapshot: ReturnType<typeof vi.fn>;
	let refresh: ReturnType<typeof vi.fn>;
	let showResolution: ReturnType<typeof vi.fn>;
	let mountedRef: { current: boolean };
	beforeEach(() => {
		const snapshot = createSessionSnapshot({
			players: [player],
			activePlayerId: player.id,
			opponentId: player.id,
			phases,
			actionCostResource,
			ruleSnapshot,
			turn: 1,
			currentPhase: phases[0]?.id ?? 'phase-upkeep',
			currentStep: phases[0]?.id ?? 'phase-upkeep',
			phaseIndex: 0,
		});
		session = {
			getSnapshot: vi.fn(() => snapshot),
		} as unknown as LegacySession;
		applyPhaseSnapshot = vi.fn();
		refresh = vi.fn();
		showResolution = vi.fn().mockResolvedValue(undefined);
		mountedRef = { current: true };
		advanceSessionPhaseMock.mockReset();
	});

	it('invokes the fatal handler when mirroring fails while advancing phases', async () => {
		const fatalError = new SessionMirroringErrorMock('Mirror failure');
		advanceSessionPhaseMock.mockRejectedValueOnce(fatalError);
		const onFatalSessionError = vi.fn();

		await advanceToActionPhase({
			session,
			sessionId: 'session-1',
			resourceKeys: [actionCostResource],
			mountedRef,
			applyPhaseSnapshot,
			refresh,
			formatPhaseResolution: vi.fn().mockReturnValue({
				lines: [],
				summaries: [],
				source: { kind: 'phase', label: 'Phase' },
			}),
			showResolution,
			registries: createSessionRegistries(),
			onFatalSessionError,
		});

		expect(onFatalSessionError).toHaveBeenCalledWith(fatalError);
		expect(showResolution).not.toHaveBeenCalled();
		expect(refresh).not.toHaveBeenCalled();
	});
});
