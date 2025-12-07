import { useCallback, useEffect, useRef, useState } from 'react';
import type { SessionSnapshot } from '@kingdom-builder/protocol/session';
import { advanceToActionPhase } from './usePhaseProgress.helpers';
import { advanceSessionPhase } from './sessionSdk';
import { getSessionRecord } from './sessionStateStore';
import {
	SessionMirroringError,
	markFatalSessionError,
	isFatalSessionError,
} from './sessionErrors';
import type { SessionRegistries, SessionResourceKey } from './sessionTypes';
import { formatPhaseResolution } from './formatPhaseResolution';
import type { ShowResolutionOptions } from './useActionResolution';

interface PhaseProgressOptions {
	sessionSnapshot: SessionSnapshot;
	sessionId: string;
	actionCostResource: SessionResourceKey;
	mountedRef: React.MutableRefObject<boolean>;
	refresh: () => void;
	resourceKeys: SessionResourceKey[];
	enqueue: <T>(task: () => Promise<T> | T) => Promise<T>;
	registries: Pick<
		SessionRegistries,
		| 'actions'
		| 'actionCategories'
		| 'buildings'
		| 'developments'
		| 'resources'
		| 'populations'
	>;
	showResolution: (options: ShowResolutionOptions) => Promise<void>;
	onFatalSessionError?: ((error: unknown) => void) | undefined;
	onSnapshotApplied?: (snapshot: SessionSnapshot) => void;
}

export interface PhaseProgressState {
	currentPhaseId: string;
	isActionPhase: boolean;
	canEndTurn: boolean;
	isAdvancing: boolean;
	activePlayerId: string | null;
	activePlayerName: string | null;
	turnNumber: number;
	awaitingManualStart: boolean;
}

export interface RunUntilActionPhaseOptions {
	forceAdvance?: boolean;
}

function requiresManualStart(snapshot: SessionSnapshot): boolean {
	if (snapshot.game.conclusion) {
		return false;
	}
	if (snapshot.game.turn !== 1) {
		return false;
	}
	if (snapshot.game.phaseIndex !== 0) {
		return false;
	}
	if (snapshot.game.stepIndex !== 0) {
		return false;
	}
	const firstPhase = snapshot.phases[0];
	if (!firstPhase) {
		return false;
	}
	if (snapshot.game.currentPhase !== firstPhase.id) {
		return false;
	}
	const firstStepId = firstPhase.steps?.[0]?.id ?? firstPhase.id;
	if (snapshot.game.currentStep !== firstStepId) {
		return false;
	}
	const firstPlayer = snapshot.game.players[0];
	if (!firstPlayer) {
		return false;
	}
	return snapshot.game.activePlayerId === firstPlayer.id;
}

function computePhaseState(
	snapshot: SessionSnapshot,
	actionCostResource: SessionResourceKey,
	overrides: Partial<PhaseProgressState> = {},
): PhaseProgressState {
	const currentPhaseId = snapshot.game.currentPhase;
	const phaseDefinition = snapshot.phases[snapshot.game.phaseIndex];
	const isActionPhase = Boolean(phaseDefinition?.action);
	const activePlayer = snapshot.game.players.find(
		(player) => player.id === snapshot.game.activePlayerId,
	);
	const remainingActionPoints = activePlayer?.valuesV2[actionCostResource] ?? 0;
	const isAiTurn = Boolean(activePlayer?.aiControlled);
	const canEndTurn = isAiTurn
		? false
		: (overrides.canEndTurn ?? (isActionPhase && remainingActionPoints <= 0));
	const isAdvancing = overrides.isAdvancing ?? false;
	return {
		currentPhaseId,
		isActionPhase,
		canEndTurn,
		isAdvancing,
		activePlayerId: overrides.activePlayerId ?? activePlayer?.id ?? null,
		activePlayerName: overrides.activePlayerName ?? activePlayer?.name ?? null,
		turnNumber: overrides.turnNumber ?? snapshot.game.turn,
		awaitingManualStart: overrides.awaitingManualStart ?? false,
	};
}

export function usePhaseProgress({
	sessionSnapshot,
	sessionId,
	actionCostResource,
	mountedRef,
	refresh,
	resourceKeys,
	enqueue,
	registries,
	showResolution,
	onFatalSessionError,
	onSnapshotApplied,
}: PhaseProgressOptions) {
	const initialAwaitingManualStart = requiresManualStart(sessionSnapshot);
	const awaitingManualStartRef = useRef<boolean>(initialAwaitingManualStart);
	const [awaitingManualStart, setAwaitingManualStart] = useState<boolean>(
		initialAwaitingManualStart,
	);
	const updateAwaitingManualStart = useCallback((value: boolean) => {
		awaitingManualStartRef.current = value;
		setAwaitingManualStart(value);
	}, []);
	const initialPhaseState = computePhaseState(
		sessionSnapshot,
		actionCostResource,
		{
			awaitingManualStart,
		},
	);
	const [phaseState, setPhaseState] =
		useState<PhaseProgressState>(initialPhaseState);
	const [initializing, setInitializing] = useState<boolean>(
		() => !initialPhaseState.isActionPhase && !initialAwaitingManualStart,
	);

	const sessionSnapshotRef = useRef(sessionSnapshot);

	useEffect(() => {
		sessionSnapshotRef.current = sessionSnapshot;
	}, [sessionSnapshot]);

	useEffect(() => {
		const snapshot = sessionSnapshotRef.current;
		const manualStart = requiresManualStart(snapshot);
		updateAwaitingManualStart(manualStart);
		const resetState = computePhaseState(snapshot, actionCostResource, {
			awaitingManualStart: manualStart,
		});
		setPhaseState(resetState);
		setInitializing(!resetState.isActionPhase && !manualStart);
	}, [sessionId, actionCostResource, updateAwaitingManualStart]);

	const markInitialized = useCallback((next: PhaseProgressState) => {
		setInitializing((current) => {
			if (!current) {
				return current;
			}
			if (!next.isActionPhase || next.isAdvancing) {
				return current;
			}
			return false;
		});
	}, []);

	const applyPhaseSnapshot = useCallback(
		(
			snapshot: SessionSnapshot,
			overrides: Partial<PhaseProgressState> = {},
		) => {
			let manualStart = awaitingManualStartRef.current;
			if (manualStart) {
				manualStart = requiresManualStart(snapshot);
				if (manualStart !== awaitingManualStartRef.current) {
					updateAwaitingManualStart(manualStart);
				}
			}
			const nextState = computePhaseState(snapshot, actionCostResource, {
				...overrides,
				awaitingManualStart: manualStart,
			});
			markInitialized(nextState);
			setPhaseState(nextState);
			if (onSnapshotApplied) {
				onSnapshotApplied(snapshot);
			}
		},
		[
			actionCostResource,
			markInitialized,
			updateAwaitingManualStart,
			onSnapshotApplied,
		],
	);

	const refreshPhaseState = useCallback(
		(overrides: Partial<PhaseProgressState> = {}) => {
			const record = getSessionRecord(sessionId);
			const snapshot = record?.snapshot ?? sessionSnapshot;
			applyPhaseSnapshot(snapshot, overrides);
		},
		[applyPhaseSnapshot, sessionId, sessionSnapshot],
	);

	useEffect(() => {
		setPhaseState((previous) => {
			if (previous.isAdvancing) {
				return previous;
			}
			let manualStart = awaitingManualStartRef.current;
			if (manualStart) {
				manualStart = requiresManualStart(sessionSnapshot);
				if (manualStart !== awaitingManualStartRef.current) {
					updateAwaitingManualStart(manualStart);
				}
			}
			const nextState = computePhaseState(sessionSnapshot, actionCostResource, {
				awaitingManualStart: manualStart,
			});
			markInitialized(nextState);
			return nextState;
		});
	}, [
		sessionSnapshot,
		actionCostResource,
		markInitialized,
		updateAwaitingManualStart,
	]);

	const runUntilActionPhaseCore = useCallback(
		(options: RunUntilActionPhaseOptions = {}) => {
			const record = getSessionRecord(sessionId);
			const latestSnapshot = record?.snapshot ?? sessionSnapshotRef.current;
			return advanceToActionPhase({
				sessionId,
				initialSnapshot: latestSnapshot,
				resourceKeys,
				mountedRef,
				applyPhaseSnapshot,
				refresh,
				formatPhaseResolution,
				showResolution,
				registries,
				...(onFatalSessionError ? { onFatalSessionError } : {}),
				...(options.forceAdvance ? { forceAdvance: options.forceAdvance } : {}),
			});
		},
		[
			applyPhaseSnapshot,
			formatPhaseResolution,
			mountedRef,
			onFatalSessionError,
			sessionId,
			refresh,
			resourceKeys,
			registries,
			showResolution,
		],
	);

	const runUntilActionPhase = useCallback(
		(options?: RunUntilActionPhaseOptions) =>
			enqueue(() => runUntilActionPhaseCore(options ?? {})),
		[enqueue, runUntilActionPhaseCore],
	);

	const startSession = useCallback(async () => {
		if (!awaitingManualStartRef.current) {
			return;
		}
		updateAwaitingManualStart(false);
		setPhaseState((previous) => ({
			...previous,
			awaitingManualStart: false,
		}));
		await runUntilActionPhase({ forceAdvance: true });
	}, [runUntilActionPhase, updateAwaitingManualStart]);

	const endTurn = useCallback(async () => {
		const record = getSessionRecord(sessionId);
		const snapshot = record?.snapshot ?? sessionSnapshot;
		if (snapshot.game.conclusion) {
			return;
		}
		const phaseDef = snapshot.phases[snapshot.game.phaseIndex];
		if (!phaseDef?.action) {
			return;
		}
		const activePlayer = snapshot.game.players.find(
			(player) => player.id === snapshot.game.activePlayerId,
		);
		if (!activePlayer) {
			return;
		}
		if ((activePlayer.valuesV2[actionCostResource] ?? 0) > 0) {
			return;
		}
		applyPhaseSnapshot(snapshot, { isAdvancing: true, canEndTurn: false });
		try {
			await advanceSessionPhase({ sessionId }, undefined, { skipQueue: true });
			await runUntilActionPhaseCore();
		} catch (error) {
			const record = getSessionRecord(sessionId);
			const latest = record?.snapshot ?? sessionSnapshot;
			applyPhaseSnapshot(latest, {
				isAdvancing: false,
			});
			if (error instanceof SessionMirroringError) {
				if (isFatalSessionError(error)) {
					return;
				}
				if (onFatalSessionError) {
					markFatalSessionError(error);
					onFatalSessionError(error);
					return;
				}
				throw error;
			}
			markFatalSessionError(error);
			if (onFatalSessionError) {
				onFatalSessionError(error);
				return;
			}
			throw error;
		}
	}, [
		actionCostResource,
		applyPhaseSnapshot,
		runUntilActionPhaseCore,
		sessionId,
		sessionSnapshot,
		onFatalSessionError,
	]);

	const handleEndTurn = useCallback(() => enqueue(endTurn), [enqueue, endTurn]);

	return {
		phase: phaseState,
		initializing,
		runUntilActionPhase,
		runUntilActionPhaseCore,
		handleEndTurn,
		endTurn,
		applyPhaseSnapshot,
		refreshPhaseState,
		startSession,
	};
}
