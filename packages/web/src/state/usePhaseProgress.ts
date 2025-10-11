import { useCallback, useEffect, useState, type MutableRefObject } from 'react';
import type {
	SessionPlayerStateSnapshot,
	SessionSnapshot,
} from '@kingdom-builder/protocol/session';
import type { PhaseProgressState, PhaseStep } from './phaseTypes';
import { usePhaseDelays } from './usePhaseDelays';
import { useMainPhaseTracker } from './useMainPhaseTracker';
import { advanceToActionPhase } from './usePhaseProgress.helpers';
import { advanceSessionPhase } from './sessionSdk';
import type {
	LegacySession,
	SessionRegistries,
	SessionResourceKey,
} from './sessionTypes';
import type { ShowResolutionOptions } from './useActionResolution';
import { formatPhaseResolution } from './formatPhaseResolution';

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
	mountedRef: MutableRefObject<boolean>;
	timeScaleRef: MutableRefObject<number>;
	setTrackedInterval: (callback: () => void, delay: number) => number;
	clearTrackedInterval: (id: number) => void;
	refresh: () => void;
	resourceKeys: SessionResourceKey[];
	enqueue: <T>(task: () => Promise<T> | T) => Promise<T>;
	registries: Pick<
		SessionRegistries,
		'actions' | 'buildings' | 'developments' | 'populations' | 'resources'
	>;
	showResolution: (options: ShowResolutionOptions) => Promise<void>;
}

type ApplyPhaseSnapshot = (
	snapshot: SessionSnapshot,
	overrides?: Partial<PhaseProgressState>,
) => void;

type PhaseHistories = Record<string, PhaseStep[]>;

type PhaseLogHandler = (
	entry: string | string[],
	player?: SessionPlayerStateSnapshot,
) => void;

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
	showResolution,
}: PhaseProgressOptions) {
	const [phaseState, setPhaseState] = useState<PhaseProgressState>(() =>
		computePhaseState(sessionState, actionCostResource),
	);
	const [phaseSteps, setPhaseSteps] = useState<PhaseStep[]>([]);
	const [phaseTimer, setPhaseTimer] = useState(0);
	const [displayPhase, setDisplayPhase] = useState(
		sessionState.game.currentPhase,
	);
	const [phaseHistories, setPhaseHistories] = useState<PhaseHistories>({});
	const [tabsEnabled, setTabsEnabled] = useState(false);

	const applyPhaseSnapshot = useCallback<ApplyPhaseSnapshot>(
		(snapshot, overrides = {}) => {
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

	const { runDelay, runStepDelay } = usePhaseDelays({
		mountedRef,
		timeScaleRef,
		setTrackedInterval,
		clearTrackedInterval,
		setPhaseTimer,
	});

	const { mainApStart, setMainApStart, updateMainPhaseStep } =
		useMainPhaseTracker({
			session,
			actionCostResource,
			actionPhaseId,
			setPhaseSteps,
			setPhaseHistories,
			setDisplayPhase,
			resources: registries.resources,
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
				applyPhaseSnapshot,
				setPhaseSteps,
				setPhaseHistories,
				setPhaseTimer,
				setDisplayPhase,
				setTabsEnabled,
				setMainApStart,
				updateMainPhaseStep,
				addLog: addLog as PhaseLogHandler,
				refresh,
				registries,
				formatPhaseResolution,
				showResolution,
			}),
		[
			actionCostResource,
			addLog,
			applyPhaseSnapshot,
			formatPhaseResolution,
			mountedRef,
			refresh,
			registries,
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
			showResolution,
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
		applyPhaseSnapshot(snapshot, { isAdvancing: true, canEndTurn: false });
		try {
			await advanceSessionPhase({ sessionId });
			setPhaseHistories({});
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
		phase: phaseState,
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
		applyPhaseSnapshot,
		refreshPhaseState,
		updateMainPhaseStep,
		setPhaseHistories,
		setTabsEnabled,
	};
}
