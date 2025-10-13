import { useCallback, useEffect, useState } from 'react';
import type { SessionSnapshot } from '@kingdom-builder/protocol/session';
import { advanceToActionPhase } from './usePhaseProgress.helpers';
import {
	advanceSessionPhase,
	SessionMirroringError,
	markFatalSessionError,
	isFatalSessionError,
} from './sessionSdk';
import type { SessionRegistries, SessionResourceKey } from './sessionTypes';
import { formatPhaseResolution } from './formatPhaseResolution';
import type { ShowResolutionOptions } from './useActionResolution';

interface PhaseProgressOptions {
	sessionState: SessionSnapshot;
	sessionId: string;
	actionCostResource: SessionResourceKey;
	mountedRef: React.MutableRefObject<boolean>;
	refresh: () => void;
	resourceKeys: SessionResourceKey[];
	enqueue: <T>(task: () => Promise<T> | T) => Promise<T>;
	registries: Pick<
		SessionRegistries,
		'actions' | 'buildings' | 'developments' | 'resources' | 'populations'
	>;
	showResolution: (options: ShowResolutionOptions) => Promise<void>;
	readLatestSnapshot: () => SessionSnapshot | null;
	onFatalSessionError?: ((error: unknown) => void) | undefined;
}

export interface PhaseProgressState {
	currentPhaseId: string;
	isActionPhase: boolean;
	canEndTurn: boolean;
	isAdvancing: boolean;
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
	const canEndTurn =
		overrides.canEndTurn ?? (isActionPhase && remainingActionPoints <= 0);
	const isAdvancing = overrides.isAdvancing ?? false;
	return {
		currentPhaseId,
		isActionPhase,
		canEndTurn,
		isAdvancing,
	};
}

export function usePhaseProgress({
	sessionState,
	sessionId,
	actionCostResource,
	mountedRef,
	refresh,
	resourceKeys,
	enqueue,
	registries,
	showResolution,
	readLatestSnapshot,
	onFatalSessionError,
}: PhaseProgressOptions) {
	const [phaseState, setPhaseState] = useState<PhaseProgressState>(() =>
		computePhaseState(sessionState, actionCostResource),
	);

	const applyPhaseSnapshot = useCallback(
		(
			snapshot: SessionSnapshot,
			overrides: Partial<PhaseProgressState> = {},
		) => {
			setPhaseState(computePhaseState(snapshot, actionCostResource, overrides));
		},
		[actionCostResource],
	);

	const readPhaseSnapshot = useCallback(() => {
		const latest = readLatestSnapshot();
		return latest ?? sessionState;
	}, [readLatestSnapshot, sessionState]);

	const refreshPhaseState = useCallback(
		(overrides: Partial<PhaseProgressState> = {}) => {
			const snapshot = readPhaseSnapshot();
			applyPhaseSnapshot(snapshot, overrides);
		},
		[applyPhaseSnapshot, readPhaseSnapshot],
	);

	useEffect(() => {
		setPhaseState((previous) => {
			if (previous.isAdvancing) {
				return previous;
			}
			return computePhaseState(sessionState, actionCostResource);
		});
	}, [sessionState, actionCostResource]);

	const runUntilActionPhaseCore = useCallback(
		() =>
			advanceToActionPhase({
				sessionId,
				resourceKeys,
				mountedRef,
				applyPhaseSnapshot,
				refresh,
				formatPhaseResolution,
				showResolution,
				registries,
				getSnapshot: readPhaseSnapshot,
				...(onFatalSessionError ? { onFatalSessionError } : {}),
			}),
		[
			applyPhaseSnapshot,
			formatPhaseResolution,
			mountedRef,
			onFatalSessionError,
			refresh,
			resourceKeys,
			registries,
			sessionId,
			showResolution,
			readPhaseSnapshot,
		],
	);

	const runUntilActionPhase = useCallback(
		() => enqueue(runUntilActionPhaseCore),
		[enqueue, runUntilActionPhaseCore],
	);

	const endTurn = useCallback(async () => {
		const snapshot = readPhaseSnapshot();
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
			await advanceSessionPhase({ sessionId });
			await runUntilActionPhaseCore();
		} catch (error) {
			applyPhaseSnapshot(readPhaseSnapshot(), {
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
		onFatalSessionError,
		readPhaseSnapshot,
	]);

	const handleEndTurn = useCallback(() => enqueue(endTurn), [enqueue, endTurn]);

	return {
		phase: phaseState,
		runUntilActionPhase,
		runUntilActionPhaseCore,
		handleEndTurn,
		endTurn,
		applyPhaseSnapshot,
		refreshPhaseState,
	};
}
