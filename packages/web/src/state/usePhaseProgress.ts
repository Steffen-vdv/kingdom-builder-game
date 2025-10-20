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
}

export interface PhaseProgressState {
	currentPhaseId: string;
	isActionPhase: boolean;
	canEndTurn: boolean;
	isAdvancing: boolean;
	activePlayerId: string | null;
	activePlayerName: string | null;
	turnNumber: number;
}

export interface RunUntilActionPhaseOptions {
	forceAdvance?: boolean;
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
	const remainingActionPoints =
		activePlayer?.resources[actionCostResource] ?? 0;
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
}: PhaseProgressOptions) {
	const initialPhaseState = computePhaseState(
		sessionSnapshot,
		actionCostResource,
	);
	const [phaseState, setPhaseState] =
		useState<PhaseProgressState>(initialPhaseState);
	const [initializing, setInitializing] = useState<boolean>(
		() => !initialPhaseState.isActionPhase,
	);

	const sessionSnapshotRef = useRef(sessionSnapshot);

	useEffect(() => {
		sessionSnapshotRef.current = sessionSnapshot;
	}, [sessionSnapshot]);

	useEffect(() => {
		const resetState = computePhaseState(
			sessionSnapshotRef.current,
			actionCostResource,
		);
		setPhaseState(resetState);
		setInitializing(!resetState.isActionPhase);
	}, [sessionId, actionCostResource]);

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
			const nextState = computePhaseState(
				snapshot,
				actionCostResource,
				overrides,
			);
			markInitialized(nextState);
			setPhaseState(nextState);
		},
		[actionCostResource, markInitialized],
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
			const nextState = computePhaseState(sessionSnapshot, actionCostResource);
			markInitialized(nextState);
			return nextState;
		});
	}, [sessionSnapshot, actionCostResource, markInitialized]);

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
		if ((activePlayer.resources[actionCostResource] ?? 0) > 0) {
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
	};
}
