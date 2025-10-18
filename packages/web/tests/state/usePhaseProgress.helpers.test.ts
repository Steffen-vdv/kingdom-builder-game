/** @vitest-environment jsdom */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { advanceToActionPhase } from '../../src/state/usePhaseProgress.helpers';
import { SessionMirroringError } from '../../src/state/sessionErrors';
import type {
	SessionAdvanceResponse,
	SessionSnapshot,
} from '@kingdom-builder/protocol/session';
import {
	createSessionSnapshot,
	createSnapshotPlayer,
} from '../helpers/sessionFixtures';
import {
	createResourceKeys,
	createSessionRegistries,
	createSessionRegistriesPayload,
} from '../helpers/sessionRegistries';
import {
	clearSessionStateStore,
	initializeSessionState,
	updateSessionSnapshot,
} from '../../src/state/sessionStateStore';

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
		clearSessionStateStore();
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
		const player = createSnapshotPlayer({ id: 'A' });
		const opponent = createSnapshotPlayer({ id: 'B' });
		const sessionId = 'session-1';
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
		initializeSessionState({
			sessionId,
			snapshot,
			registries: createSessionRegistriesPayload(),
		});
		const mountedRef = { current: true };
		const applyPhaseSnapshot = vi.fn((snapshot: SessionSnapshot) =>
			updateSessionSnapshot(sessionId, snapshot),
		);
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
				sessionId,
				initialSnapshot: snapshot,
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
		expect(advanceSessionPhaseMock).toHaveBeenCalledWith(
			{ sessionId },
			undefined,
			expect.objectContaining({ skipQueue: true }),
		);
	});

	it('aggregates resolution lines across phase steps', async () => {
		const [actionCostResource] = createResourceKeys();
		if (!actionCostResource) {
			throw new Error('RESOURCE_KEYS is empty');
		}
		const phases = [
			{
				id: 'phase-growth',
				name: 'Growth',
				action: false,
				steps: [
					{ id: 'step-income', title: 'Income' },
					{ id: 'step-upkeep', title: 'Upkeep' },
				],
			},
			{ id: 'phase-main', name: 'Main', action: true, steps: [] },
		];
		const player = createSnapshotPlayer({ id: 'A', name: 'Player One' });
		const opponent = createSnapshotPlayer({ id: 'B', name: 'Player Two' });
		const baseSnapshot = createSessionSnapshot({
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
			currentPhase: phases[0]?.id ?? 'phase-growth',
			currentStep: phases[0]?.steps?.[0]?.id ?? 'step-income',
			phaseIndex: 0,
			stepIndex: 0,
		});
		const sessionId = 'session-aggregate';
		initializeSessionState({
			sessionId,
			snapshot: baseSnapshot,
			registries: createSessionRegistriesPayload(),
		});
		const mountedRef = { current: true };
		const applyPhaseSnapshot = vi.fn((snapshot: SessionSnapshot) =>
			updateSessionSnapshot(sessionId, snapshot),
		);
		const refresh = vi.fn();
		const formattedStepOne = {
			source: {
				kind: 'phase' as const,
				label: 'Growth Phase',
				name: 'Income',
			},
			lines: ['Growth Phase – Income', '+1 Gold'],
			summaries: ['+1 Gold'],
			actorLabel: 'Growth Phase',
		};
		const formattedStepTwo = {
			source: {
				kind: 'phase' as const,
				label: 'Growth Phase',
				name: 'Upkeep',
			},
			lines: ['Growth Phase – Upkeep', '-1 Gold'],
			summaries: ['-1 Gold'],
			actorLabel: 'Growth Phase',
		};
		const formattedStepThree = {
			source: {
				kind: 'phase' as const,
				label: 'Growth Phase',
				name: 'Action Phase Transition',
			},
			lines: [],
			summaries: [],
			actorLabel: 'Growth Phase',
		};
		const resultsQueue = [
			formattedStepOne,
			formattedStepTwo,
			formattedStepThree,
		];
		const formatPhaseResolution = vi.fn().mockImplementation(() => {
			const next = resultsQueue.shift();
			if (!next) {
				throw new Error('Expected phase resolution result');
			}
			return next;
		});
		const showResolution = vi.fn().mockResolvedValue(undefined);
		const registries = createSessionRegistries();
		const playerAfter = createSnapshotPlayer({
			id: player.id,
			name: player.name,
		});
		const firstSnapshot = createSessionSnapshot({
			players: [playerAfter, opponent],
			activePlayerId: player.id,
			opponentId: opponent.id,
			phases,
			actionCostResource,
			ruleSnapshot: {
				tieredResourceKey: actionCostResource,
				tierDefinitions: [],
				winConditions: [],
			},
			currentPhase: phases[0]?.id ?? 'phase-growth',
			currentStep: phases[0]?.steps?.[1]?.id ?? 'step-upkeep',
			phaseIndex: 0,
			stepIndex: 1,
		});
		const secondSnapshot = createSessionSnapshot({
			players: [playerAfter, opponent],
			activePlayerId: player.id,
			opponentId: opponent.id,
			phases,
			actionCostResource,
			ruleSnapshot: {
				tieredResourceKey: actionCostResource,
				tierDefinitions: [],
				winConditions: [],
			},
			currentPhase: phases[1]?.id ?? 'phase-main',
			currentStep: phases[1]?.id ?? 'phase-main',
			phaseIndex: 1,
			stepIndex: 0,
		});
		const firstAdvance: SessionAdvanceResponse = {
			sessionId,
			snapshot: firstSnapshot,
			advance: {
				phase: phases[0]?.id ?? 'phase-growth',
				step: phases[0]?.steps?.[0]?.id ?? 'step-income',
				effects: [],
				player: playerAfter,
			},
		};
		const secondAdvance: SessionAdvanceResponse = {
			sessionId,
			snapshot: secondSnapshot,
			advance: {
				phase: phases[0]?.id ?? 'phase-growth',
				step: phases[0]?.steps?.[1]?.id ?? 'step-upkeep',
				effects: [],
				player: playerAfter,
			},
		};
		advanceSessionPhaseMock
			.mockImplementationOnce(() => {
				updateSessionSnapshot(sessionId, firstSnapshot);
				return Promise.resolve(firstAdvance);
			})
			.mockImplementationOnce(() => {
				updateSessionSnapshot(sessionId, secondSnapshot);
				return Promise.resolve(secondAdvance);
			})
			.mockImplementation(() => {
				updateSessionSnapshot(sessionId, secondSnapshot);
				return Promise.resolve(secondAdvance);
			});

		await advanceToActionPhase({
			sessionId,
			initialSnapshot: baseSnapshot,
			resourceKeys: [actionCostResource],
			mountedRef,
			applyPhaseSnapshot,
			refresh,
			formatPhaseResolution: formatPhaseResolution as never,
			showResolution: showResolution as never,
			registries,
		});

		const resolutionCallCount = formatPhaseResolution.mock.calls.length;
		expect(resolutionCallCount).toBeGreaterThanOrEqual(2);
		expect(resolutionCallCount).toBeLessThanOrEqual(3);
		expect(showResolution).toHaveBeenCalledTimes(1);
		const [options] = showResolution.mock.calls[0] ?? [];
		expect(options?.lines).toEqual([
			'Growth Phase – Income',
			'+1 Gold',
			'Growth Phase – Upkeep',
			'-1 Gold',
		]);
		expect(options?.summaries).toEqual(['+1 Gold', '-1 Gold']);
		expect(options?.source).toEqual(formattedStepOne.source);
		expect(options?.actorLabel).toBe('Growth Phase');
		expect(options?.player).toEqual(playerAfter);
		expect(options?.requireAcknowledgement).toBe(false);
	});
});
