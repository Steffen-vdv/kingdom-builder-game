import React, {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useState,
} from 'react';
import {
	createEngineSession,
	type EngineContext,
	type EngineSession,
} from '@kingdom-builder/engine';
import {
	RESOURCES,
	ACTIONS,
	BUILDINGS,
	DEVELOPMENTS,
	POPULATIONS,
	PHASES,
	GAME_START,
	RULES,
	type ResourceKey,
} from '@kingdom-builder/contents';
import { createTranslationContext } from '../translation/context';
import { useTimeScale } from './useTimeScale';
import { useHoverCard } from './useHoverCard';
import { useGameLog } from './useGameLog';
import { usePhaseProgress } from './usePhaseProgress';
import { useActionPerformer } from './useActionPerformer';
import { useErrorToasts } from './useErrorToasts';
import { useCompensationLogger } from './useCompensationLogger';
import { useAiRunner } from './useAiRunner';
import type { GameEngineContextValue } from './GameContext.types';

const RESOURCE_KEYS = Object.keys(RESOURCES) as ResourceKey[];
export { TIME_SCALE_OPTIONS } from './useTimeScale';
export type { TimeScale } from './useTimeScale';
export type { PhaseStep } from './phaseTypes';
export type { TranslationContext } from '../translation/context';

const GameEngineContext = createContext<GameEngineContextValue | null>(null);

export function GameProvider({
	children,
	onExit,
	darkMode = true,
	onToggleDark = () => {},
	devMode = false,
	musicEnabled = true,
	onToggleMusic = () => {},
	soundEnabled = true,
	onToggleSound = () => {},
}: {
	children: React.ReactNode;
	onExit?: () => void;
	darkMode?: boolean;
	onToggleDark?: () => void;
	devMode?: boolean;
	musicEnabled?: boolean;
	onToggleMusic?: () => void;
	soundEnabled?: boolean;
	onToggleSound?: () => void;
}) {
	const { session, ctx } = useMemo<{
		session: EngineSession;
		ctx: EngineContext;
	}>(() => {
		const created = createEngineSession({
			actions: ACTIONS,
			buildings: BUILDINGS,
			developments: DEVELOPMENTS,
			populations: POPULATIONS,
			phases: PHASES,
			start: GAME_START,
			rules: RULES,
		});
		created.setDevMode(devMode);
		return { session: created, ctx: created.getLegacyContext() };
	}, [devMode]);
	const [tick, setTick] = useState(0);
	const refresh = useCallback(() => setTick((t) => t + 1), []);

	const enqueue = <T,>(task: () => Promise<T> | T) => session.enqueue(task);

	const sessionState = useMemo(() => session.getSnapshot(), [session, tick]);

	const translationContext = useMemo(
		() =>
			createTranslationContext(
				sessionState,
				{
					actions: ACTIONS,
					buildings: BUILDINGS,
					developments: DEVELOPMENTS,
				},
				{
					pullEffectLog: (key) => ctx.pullEffectLog(key),
					passives: ctx.passives,
				},
			),
		[sessionState, tick, ctx],
	);

	const {
		timeScale,
		setTimeScale,
		clearTrackedTimeout,
		setTrackedTimeout,
		clearTrackedInterval,
		setTrackedInterval,
		isMountedRef: mountedRef,
		timeScaleRef,
	} = useTimeScale({ devMode });

	const actionCostResource = sessionState.actionCostResource as ResourceKey;

	const actionPhaseId = useMemo(() => {
		const phaseWithAction = sessionState.phases.find(
			(phaseDefinition) => phaseDefinition.action,
		);
		return phaseWithAction?.id;
	}, [sessionState.phases]);

	const { hoverCard, handleHoverCard, clearHoverCard } = useHoverCard({
		setTrackedTimeout,
		clearTrackedTimeout,
	});

	const { log, logOverflowed, addLog, logWithEffectDelay } = useGameLog({
		sessionState,
		mountedRef,
		timeScaleRef,
		setTrackedTimeout,
	});

	const {
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
	} = usePhaseProgress({
		session,
		sessionState,
		actionPhaseId,
		actionCostResource,
		addLog,
		mountedRef,
		timeScaleRef,
		setTrackedInterval,
		clearTrackedInterval,
		refresh,
		resourceKeys: RESOURCE_KEYS,
		enqueue,
	});

	const { errorToasts, pushErrorToast, dismissErrorToast } = useErrorToasts({
		setTrackedTimeout,
	});

	useCompensationLogger({
		session,
		sessionState,
		addLog,
		resourceKeys: RESOURCE_KEYS,
	});

	const { handlePerform, performRef } = useActionPerformer({
		session,
		actionCostResource,
		addLog,
		logWithEffectDelay,
		updateMainPhaseStep,
		refresh,
		pushErrorToast,
		mountedRef,
		endTurn,
		enqueue,
		resourceKeys: RESOURCE_KEYS,
	});

	useAiRunner({
		session,
		sessionState,
		runUntilActionPhaseCore,
		setPhaseHistories,
		performRef,
		mountedRef,
	});

	useEffect(() => {
		void runUntilActionPhase();
	}, [runUntilActionPhase]);

	const value: GameEngineContextValue = {
		session,
		sessionState,
		// TODO(engine-web#session): Remove legacy ctx usages once all
		// consumers are migrated to the session facade.
		ctx,
		translationContext,
		log,
		logOverflowed,
		hoverCard,
		handleHoverCard,
		clearHoverCard,
		phaseSteps,
		setPhaseSteps,
		phaseTimer,
		mainApStart,
		displayPhase,
		setDisplayPhase,
		phaseHistories,
		tabsEnabled,
		actionCostResource,
		handlePerform,
		runUntilActionPhase,
		handleEndTurn,
		updateMainPhaseStep,
		darkMode,
		onToggleDark,
		musicEnabled,
		onToggleMusic,
		soundEnabled,
		onToggleSound,
		timeScale,
		setTimeScale,
		errorToasts,
		pushErrorToast,
		dismissErrorToast,
		...(onExit ? { onExit } : {}),
	};

	return (
		<GameEngineContext.Provider value={value}>
			{children}
		</GameEngineContext.Provider>
	);
}

export const useGameEngine = (): GameEngineContextValue => {
	const value = useContext(GameEngineContext);
	if (!value) {
		throw new Error('useGameEngine must be used within GameProvider');
	}
	return value;
};
