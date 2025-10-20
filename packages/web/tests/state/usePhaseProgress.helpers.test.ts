/** @vitest-environment jsdom */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { advanceToActionPhase } from '../../src/state/usePhaseProgress.helpers';
import { SessionMirroringError } from '../../src/state/sessionErrors';
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
			sessionId: 'session-1',
			snapshot,
			registries: createSessionRegistriesPayload(),
		});
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
				sessionId: 'session-1',
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
			{ sessionId: 'session-1' },
			undefined,
			expect.objectContaining({ skipQueue: true }),
		);
	});

	it('omits duplicate phase headers when consecutive steps log changes', async () => {
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
					{ id: 'step-income', title: 'Gain income', effects: [] },
					{ id: 'step-ap', title: 'Gain action points', effects: [] },
				],
			},
			{ id: 'phase-action', name: 'Action', action: true, steps: [] },
		];
		const player = createSnapshotPlayer({ id: 'A' });
		const opponent = createSnapshotPlayer({ id: 'B' });
		const ruleSnapshot = {
			tieredResourceKey: actionCostResource,
			tierDefinitions: [],
			winConditions: [],
		};
		const baseOptions = {
			players: [player, opponent],
			activePlayerId: player.id,
			opponentId: opponent.id,
			phases,
			actionCostResource,
			ruleSnapshot,
			turn: 1,
		};
		const snapshot = createSessionSnapshot({
			...baseOptions,
			currentPhase: phases[0]?.id ?? 'phase-growth',
			currentStep: phases[0]?.steps?.[0]?.id ?? 'step-income',
			phaseIndex: 0,
			stepIndex: 0,
		});
		const registriesPayload = createSessionRegistriesPayload();
		initializeSessionState({
			sessionId: 'session-2',
			snapshot,
			registries: registriesPayload,
		});
		const snapshotAfterFirst = createSessionSnapshot({
			...baseOptions,
			currentPhase: phases[0]?.id ?? 'phase-growth',
			currentStep: phases[0]?.steps?.[1]?.id ?? 'step-ap',
			phaseIndex: 0,
			stepIndex: 1,
		});
		const snapshotAfterSecond = createSessionSnapshot({
			...baseOptions,
			currentPhase: phases[1]?.id ?? 'phase-action',
			currentStep: phases[1]?.id ?? 'phase-action',
			phaseIndex: 1,
			stepIndex: 0,
		});
		advanceSessionPhaseMock
			.mockImplementationOnce(() => {
				updateSessionSnapshot('session-2', snapshotAfterFirst);
				return Promise.resolve({
					sessionId: 'session-2',
					snapshot: snapshotAfterFirst,
					registries: registriesPayload,
					advance: {
						phase: phases[0]?.id ?? 'phase-growth',
						step: phases[0]?.steps?.[0]?.id ?? 'step-income',
						effects: [],
						player: snapshotAfterFirst.game.players[0]!,
					},
				});
			})
			.mockImplementationOnce(() => {
				updateSessionSnapshot('session-2', snapshotAfterSecond);
				return Promise.resolve({
					sessionId: 'session-2',
					snapshot: snapshotAfterSecond,
					registries: registriesPayload,
					advance: {
						phase: phases[0]?.id ?? 'phase-growth',
						step: phases[0]?.steps?.[1]?.id ?? 'step-ap',
						effects: [],
						player: snapshotAfterSecond.game.players[0]!,
					},
				});
			});
		const formatPhaseResolution = vi
			.fn()
			.mockReturnValueOnce({
				source: {
					kind: 'phase',
					label: '🌱 Growth Phase',
					icon: '🌱',
					id: phases[0]?.id ?? 'phase-growth',
				},
				lines: ['🌱 Growth Phase', '    🪙 Gold +2'],
				summaries: ['🪙 Gold +2'],
				actorLabel: '🌱 Growth Phase',
			})
			.mockReturnValueOnce({
				source: {
					kind: 'phase',
					label: '🌱 Growth Phase',
					icon: '🌱',
					id: phases[0]?.id ?? 'phase-growth',
				},
				lines: ['🌱 Growth Phase', '    ⚡ Action Points +1'],
				summaries: ['⚡ Action Points +1'],
				actorLabel: '🌱 Growth Phase',
			});
		const showResolution = vi.fn().mockResolvedValue(undefined);
		const mountedRef = { current: true };
		await advanceToActionPhase({
			sessionId: 'session-2',
			initialSnapshot: snapshot,
			resourceKeys: [actionCostResource],
			mountedRef,
			applyPhaseSnapshot: vi.fn(),
			refresh: vi.fn(),
			formatPhaseResolution: formatPhaseResolution as never,
			showResolution: showResolution as never,
			registries: createSessionRegistries(),
		});
		expect(showResolution).toHaveBeenCalledTimes(2);
		const firstFormatCall = formatPhaseResolution.mock.calls[0]?.[0];
		expect(firstFormatCall?.phaseDefinition).toEqual(
			expect.objectContaining({ id: phases[0]?.id ?? 'phase-growth' }),
		);
		expect(firstFormatCall?.stepDefinition).toEqual(
			expect.objectContaining({
				id: phases[0]?.steps?.[0]?.id ?? 'step-income',
			}),
		);
		const secondFormatCall = formatPhaseResolution.mock.calls[1]?.[0];
		expect(secondFormatCall?.phaseDefinition).toEqual(
			expect.objectContaining({ id: phases[0]?.id ?? 'phase-growth' }),
		);
		expect(secondFormatCall?.stepDefinition).toEqual(
			expect.objectContaining({ id: phases[0]?.steps?.[1]?.id ?? 'step-ap' }),
		);
		expect(showResolution).toHaveBeenNthCalledWith(
			1,
			expect.objectContaining({
				lines: ['🌱 Growth Phase', '    🪙 Gold +2'],
				actorLabel: '🌱 Growth Phase',
			}),
		);
		expect(showResolution).toHaveBeenNthCalledWith(
			2,
			expect.objectContaining({
				lines: ['    ⚡ Action Points +1'],
				actorLabel: '🌱 Growth Phase',
			}),
		);
	});

	it('advances at least once when forced from an action phase snapshot', async () => {
		const [actionCostResource] = createResourceKeys();
		if (!actionCostResource) {
			throw new Error('RESOURCE_KEYS is empty');
		}
		const phases = [
			{ id: 'phase-ai', name: 'AI Action', action: true, steps: [] },
			{ id: 'phase-player', name: 'Player Action', action: true, steps: [] },
		];
		const aiPlayer = createSnapshotPlayer({ id: 'AI', aiControlled: true });
		const humanPlayer = createSnapshotPlayer({
			id: 'Human',
			aiControlled: false,
		});
		const ruleSnapshot = {
			tieredResourceKey: actionCostResource,
			tierDefinitions: [],
			winConditions: [],
		};
		const sessionId = 'session-forced';
		const initialSnapshot = createSessionSnapshot({
			players: [aiPlayer, humanPlayer],
			activePlayerId: aiPlayer.id,
			opponentId: humanPlayer.id,
			phases,
			actionCostResource,
			ruleSnapshot,
			currentPhase: phases[0]?.id ?? 'phase-ai',
			currentStep: phases[0]?.id ?? 'phase-ai',
			phaseIndex: 0,
			turn: 1,
		});
		const nextSnapshot = createSessionSnapshot({
			players: [aiPlayer, humanPlayer],
			activePlayerId: humanPlayer.id,
			opponentId: aiPlayer.id,
			phases,
			actionCostResource,
			ruleSnapshot,
			currentPhase: phases[1]?.id ?? 'phase-player',
			currentStep: phases[1]?.id ?? 'phase-player',
			phaseIndex: 1,
			turn: 1,
		});
		const registriesPayload = createSessionRegistriesPayload();
		initializeSessionState({
			sessionId,
			snapshot: initialSnapshot,
			registries: registriesPayload,
		});
		advanceSessionPhaseMock.mockImplementationOnce(() => {
			updateSessionSnapshot(sessionId, nextSnapshot);
			return Promise.resolve({
				sessionId,
				snapshot: nextSnapshot,
				registries: registriesPayload,
				advance: {
					phase: phases[0]?.id ?? 'phase-ai',
					step: phases[0]?.id ?? 'phase-ai',
					effects: [],
					player: nextSnapshot.game.players[1]!,
				},
			});
		});
		const mountedRef = { current: true };
		const applyPhaseSnapshot = vi.fn();
		const refresh = vi.fn();
		const formatPhaseResolution = vi.fn().mockReturnValue({
			source: {
				kind: 'phase',
				label: 'AI Action',
				id: phases[0]?.id ?? 'phase-ai',
			},
			lines: [],
			summaries: [],
		});
		await advanceToActionPhase({
			sessionId,
			initialSnapshot,
			resourceKeys: [actionCostResource],
			mountedRef,
			applyPhaseSnapshot,
			refresh,
			formatPhaseResolution: formatPhaseResolution as never,
			showResolution: vi.fn().mockResolvedValue(undefined) as never,
			registries: createSessionRegistries(),
			forceAdvance: true,
		});
		expect(advanceSessionPhaseMock).toHaveBeenCalledTimes(1);
		expect(applyPhaseSnapshot).toHaveBeenNthCalledWith(
			1,
			initialSnapshot,
			expect.objectContaining({
				isAdvancing: true,
				canEndTurn: false,
			}),
		);
		expect(applyPhaseSnapshot).toHaveBeenNthCalledWith(
			2,
			nextSnapshot,
			expect.objectContaining({
				isAdvancing: true,
				canEndTurn: false,
			}),
		);
		expect(applyPhaseSnapshot).toHaveBeenNthCalledWith(
			3,
			nextSnapshot,
			expect.objectContaining({ isAdvancing: false }),
		);
		expect(refresh).toHaveBeenCalledTimes(1);
	});
});
