import { useCallback, useEffect, useState } from 'react';
import type {
	SessionPlayerStateSnapshot,
	SessionSnapshot,
} from '@kingdom-builder/protocol/session';
import type { PhaseStep } from './GameContext.types';
import { advanceToActionPhase } from './usePhaseProgress.helpers';
import { advanceSessionPhase } from './sessionSdk';
import type {
	LegacySession,
	SessionRegistries,
	SessionResourceKey,
} from './sessionTypes';

interface PhaseProgressOptions {
	session: LegacySession;
	sessionState: SessionSnapshot;
	sessionId: string;
	actionPhaseId: string | undefined;
	actionCostResource: SessionResourceKey;
	addLog: (
		entry: string | string[],
		player?: SessionPlayerStateSnapshot,
	) => void;
	mountedRef: React.MutableRefObject<boolean>;
	timeScaleRef: React.MutableRefObject<number>;
	setTrackedInterval: (callback: () => void, delay: number) => number;
	clearTrackedInterval: (id: number) => void;
	refresh: () => void;
	resourceKeys: SessionResourceKey[];
	enqueue: <T>(task: () => Promise<T> | T) => Promise<T>;
	registries: Pick<
		SessionRegistries,
		'actions' | 'buildings' | 'developments' | 'resources' | 'populations'
	>;
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
	registries,
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
	const [mainApStart, setMainApStart] = useState(0);
	const resources = registries.resources;

	const updateMainPhaseStep = useCallback(
		(apStartOverride?: number) => {
			const snapshot = session.getSnapshot();
			const activePlayer = snapshot.game.players.find(
				(player) => player.id === snapshot.game.activePlayerId,
			);
			if (!activePlayer) {
				return;
			}
			const total = apStartOverride ?? mainApStart;
			const remaining = activePlayer.resources[actionCostResource] ?? 0;
			const spent = total - remaining;
			const resourceInfo = resources[actionCostResource];
			const costLabel = resourceInfo?.label ?? actionCostResource;
			const costIcon = resourceInfo?.icon ?? '';
			const costSummary = `${costIcon} ${spent}/${total} spent`;
			const steps: PhaseStep[] = [
				{
					title: `Step 1 - Spend all ${costLabel}`,
					items: [
						{
							text: costSummary,
							done: remaining === 0,
						},
					],
					active: remaining > 0,
				},
			];
			setPhaseSteps(steps);
			if (actionPhaseId) {
				setPhaseHistories((prev) => ({
					...prev,
					[actionPhaseId]: steps,
				}));
				setDisplayPhase(actionPhaseId);
			} else {
				setDisplayPhase(snapshot.game.currentPhase);
			}
		},
		[
			actionCostResource,
			actionPhaseId,
			mainApStart,
			resources,
			session,
			setDisplayPhase,
			setPhaseHistories,
			setPhaseSteps,
		],
	);

	const runDelay = useCallback(
		(total: number) => {
			const scale = timeScaleRef.current || 1;
			const adjustedTotal = total / scale;
			if (adjustedTotal <= 0) {
				if (mountedRef.current) {
					setPhaseTimer(0);
				}
				return Promise.resolve();
			}
			const tick = Math.max(16, Math.min(100, adjustedTotal / 10));
			if (mountedRef.current) {
				setPhaseTimer(0);
			}
			return new Promise<void>((resolve) => {
				let elapsed = 0;
				const interval = setTrackedInterval(() => {
					elapsed += tick;
					if (mountedRef.current) {
						setPhaseTimer(Math.min(1, elapsed / adjustedTotal));
					}
					if (elapsed >= adjustedTotal) {
						clearTrackedInterval(interval);
						if (mountedRef.current) {
							setPhaseTimer(0);
						}
						resolve();
					}
				}, tick);
			});
		},
		[
			clearTrackedInterval,
			mountedRef,
			setTrackedInterval,
			setPhaseTimer,
			timeScaleRef,
		],
	);

	const runStepDelay = useCallback(() => runDelay(1000), [runDelay]);

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
				registries,
			}),
		[
			actionCostResource,
			addLog,
			mountedRef,
			refresh,
			resourceKeys,
			registries,
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
