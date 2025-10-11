import { useCallback, useEffect, useState } from 'react';
import type { SessionSnapshot } from '@kingdom-builder/protocol/session';
import { advanceToActionPhase } from './usePhaseProgress.helpers';
import { advanceSessionPhase } from './sessionSdk';
import type {
	LegacySession,
	SessionRegistries,
	SessionResourceKey,
} from './sessionTypes';
import { formatPhaseResolution } from './formatPhaseResolution';
import type { ShowResolutionOptions } from './useActionResolution';

interface PhaseProgressOptions {
	session: LegacySession;
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
	session,
	sessionState,
	sessionId,
	actionCostResource,
	mountedRef,
	refresh,
	resourceKeys,
	enqueue,
	registries,
	showResolution,
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

	const refreshPhaseState = useCallback(
		(overrides: Partial<PhaseProgressState> = {}) => {
			const snapshot = session.getSnapshot();
			applyPhaseSnapshot(snapshot, overrides);
		},
		[applyPhaseSnapshot, session],
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
				session,
				sessionId,
				resourceKeys,
				mountedRef,
				applyPhaseSnapshot,
				refresh,
				formatPhaseResolution,
				showResolution,
				registries,
			}),
		[
			applyPhaseSnapshot,
			mountedRef,
			refresh,
			resourceKeys,
			registries,
			session,
			sessionId,
			showResolution,
		],
	);

	const runUntilActionPhase = useCallback(
		() => enqueue(runUntilActionPhaseCore),
		[enqueue, runUntilActionPhaseCore],
	);

	const endTurn = useCallback(async () => {
		const snapshot = session.getSnapshot();
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
			applyPhaseSnapshot(session.getSnapshot(), { isAdvancing: false });
			throw error;
		}
	}, [
		actionCostResource,
		applyPhaseSnapshot,
		runUntilActionPhaseCore,
		session,
		sessionId,
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
