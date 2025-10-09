import { useCallback, useEffect, useState } from 'react';
import { type EngineSession } from '@kingdom-builder/engine';
import { type ResourceKey } from '@kingdom-builder/contents';
import type {
	SessionPlayerStateSnapshot,
	SessionSnapshot,
} from '@kingdom-builder/protocol';
import type { PhaseStep } from './phaseTypes';
import { usePhaseDelays } from './usePhaseDelays';
import { useMainPhaseTracker } from './useMainPhaseTracker';
import { advanceToActionPhase } from './usePhaseProgress.helpers';
import { advanceSessionPhase } from './sessionSdk';

interface PhaseProgressOptions {
	session: EngineSession;
	sessionState: SessionSnapshot;
	sessionId: string;
	actionPhaseId: string | undefined;
	actionCostResource: ResourceKey;
	addLog: (
		entry: string | string[],
		player?: SessionPlayerStateSnapshot,
	) => void;
	mountedRef: React.MutableRefObject<boolean>;
	timeScaleRef: React.MutableRefObject<number>;
	setTrackedInterval: (callback: () => void, delay: number) => number;
	clearTrackedInterval: (id: number) => void;
	refresh: () => void;
	resourceKeys: ResourceKey[];
	enqueue: <T>(task: () => Promise<T> | T) => Promise<T>;
}

export function usePhaseProgress({
	session,
	sessionState,
	sessionId,
	actionPhaseId,
	actionCostResource,
	addLog,
	mountedRef,
	timeScaleRef,
	setTrackedInterval,
	clearTrackedInterval,
	refresh,
	resourceKeys,
	enqueue,
}: PhaseProgressOptions) {
	const [phaseSteps, setPhaseSteps] = useState<PhaseStep[]>([]);
	const [phaseTimer, setPhaseTimer] = useState(0);
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

	const { runDelay, runStepDelay } = usePhaseDelays({
		mountedRef,
		timeScaleRef,
		setTrackedInterval,
		clearTrackedInterval,
		setPhaseTimer,
	});

	const runUntilActionPhaseCore = useCallback(
		() =>
			advanceToActionPhase({
				session,
				sessionId,
				actionCostResource,
				resourceKeys,
				runDelay,
				runStepDelay,
				mountedRef,
				setPhaseSteps,
				setPhaseHistories,
				setPhaseTimer,
				setDisplayPhase,
				setTabsEnabled,
				setMainApStart,
				updateMainPhaseStep,
				addLog,
				refresh,
			}),
		[
			actionCostResource,
			addLog,
			mountedRef,
			refresh,
			resourceKeys,
			runDelay,
			runStepDelay,
			session,
			sessionId,
			setDisplayPhase,
			setMainApStart,
			setPhaseHistories,
			setPhaseSteps,
			setPhaseTimer,
			setTabsEnabled,
			updateMainPhaseStep,
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
