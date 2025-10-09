import { useCallback, useEffect, useState } from 'react';
import { type ResourceKey } from '@kingdom-builder/contents';
import type { SessionSnapshot } from '@kingdom-builder/protocol/session';
import type { PhaseStep } from './phaseTypes';
import { useMainPhaseTracker } from './useMainPhaseTracker';
import { advanceToActionPhase } from './usePhaseProgress.helpers';
import { advanceSessionPhase } from './sessionSdk';
import type { LegacySession } from './sessionTypes';
import { formatPhaseResolution } from './formatPhaseResolution';
import type { ShowResolutionOptions } from './useActionResolution';

interface PhaseProgressOptions {
	session: LegacySession;
	sessionState: SessionSnapshot;
	sessionId: string;
	actionPhaseId: string | undefined;
	actionCostResource: ResourceKey;
	mountedRef: React.MutableRefObject<boolean>;
	refresh: () => void;
	resourceKeys: ResourceKey[];
	enqueue: <T>(task: () => Promise<T> | T) => Promise<T>;
	showResolution: (options: ShowResolutionOptions) => Promise<void>;
}

export function usePhaseProgress({
	session,
	sessionState,
	sessionId,
	actionPhaseId,
	actionCostResource,
	mountedRef,
	refresh,
	resourceKeys,
	enqueue,
	showResolution,
}: PhaseProgressOptions) {
	const [phaseSteps, setPhaseSteps] = useState<PhaseStep[]>([]);
	const [phaseTimer] = useState(0);
	const [displayPhase, setDisplayPhase] = useState(
		sessionState.game.currentPhase,
	);
	const [phaseHistories, setPhaseHistories] = useState<
		Record<string, PhaseStep[]>
	>({});
	const [tabsEnabled, setTabsEnabled] = useState(false);

	const { mainApStart, setMainApStart, updateMainPhaseStep } =
		useMainPhaseTracker({
			session,
			actionCostResource,
			actionPhaseId,
			setPhaseSteps,
			setPhaseHistories,
			setDisplayPhase,
		});

	const runUntilActionPhaseCore = useCallback(
		() =>
			advanceToActionPhase({
				session,
				sessionId,
				actionCostResource,
				resourceKeys,
				mountedRef,
				setPhaseSteps,
				setPhaseHistories,
				setDisplayPhase,
				setTabsEnabled,
				setMainApStart,
				updateMainPhaseStep,
				refresh,
				formatPhaseResolution,
				showResolution,
			}),
		[
			actionCostResource,
			mountedRef,
			refresh,
			resourceKeys,
			session,
			sessionId,
			setDisplayPhase,
			setMainApStart,
			setPhaseHistories,
			setPhaseSteps,
			setTabsEnabled,
			updateMainPhaseStep,
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
		await advanceSessionPhase({ sessionId });
		setPhaseHistories({});
		await runUntilActionPhaseCore();
	}, [actionCostResource, runUntilActionPhaseCore, session, sessionId]);

	const handleEndTurn = useCallback(() => enqueue(endTurn), [enqueue, endTurn]);

	useEffect(() => {
		if (!tabsEnabled) {
			return;
		}
		const snapshot = session.getSnapshot();
		if (!snapshot.phases[snapshot.game.phaseIndex]?.action) {
			return;
		}
		const activePlayer = snapshot.game.players.find(
			(player) => player.id === snapshot.game.activePlayerId,
		);
		if (!activePlayer) {
			return;
		}
		const start = activePlayer.resources[actionCostResource] ?? 0;
		setMainApStart(start);
		updateMainPhaseStep(start);
	}, [actionCostResource, session, tabsEnabled, updateMainPhaseStep]);

	return {
		phaseSteps,
		setPhaseSteps,
		phaseTimer,
		mainApStart,
		displayPhase,
		setDisplayPhase,
		phaseHistories,
		tabsEnabled,
		runUntilActionPhase,
		runUntilActionPhaseCore,
		handleEndTurn,
		endTurn,
		updateMainPhaseStep,
		setPhaseHistories,
		setTabsEnabled,
	};
}
