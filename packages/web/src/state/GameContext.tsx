import React, {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useRef,
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
	WIN_CONDITIONS,
	type ResourceKey,
} from '@kingdom-builder/contents';
import { createTranslationContext } from '../translation/context';
import { useTimeScale } from './useTimeScale';
import { useHoverCard } from './useHoverCard';
import { useGameLog } from './useGameLog';
import { useActionResolution } from './useActionResolution';
import type { ShowResolutionOptions } from './useActionResolution';
import { usePhaseProgress } from './usePhaseProgress';
import { useActionPerformer } from './useActionPerformer';
import { useToasts } from './useToasts';
import { useCompensationLogger } from './useCompensationLogger';
import { useAiRunner } from './useAiRunner';
import { initializeDeveloperMode } from './developerModeSetup';
import type { GameEngineContextValue } from './GameContext.types';
import { DEFAULT_PLAYER_NAME } from './playerIdentity';

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
	backgroundAudioMuted = true,
	onToggleBackgroundAudioMute = () => {},
	playerName = DEFAULT_PLAYER_NAME,
	onChangePlayerName = () => {},
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
	backgroundAudioMuted?: boolean;
	onToggleBackgroundAudioMute?: () => void;
	playerName?: string;
	onChangePlayerName?: (name: string) => void;
}) {
	const playerNameRef = useRef(playerName);
	playerNameRef.current = playerName;
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
			winConditions: WIN_CONDITIONS,
		});
		created.setDevMode(devMode);
		const legacyContext = created.getLegacyContext();
		if (devMode) {
			initializeDeveloperMode(legacyContext);
		}
		const [primary] = legacyContext.game.players;
		if (primary) {
			primary.name = playerNameRef.current ?? DEFAULT_PLAYER_NAME;
		}
		return { session: created, ctx: legacyContext };
	}, [devMode]);
	const [tick, setTick] = useState(0);
	const refresh = useCallback(() => setTick((t) => t + 1), []);

	const enqueue = <T,>(task: () => Promise<T> | T) => session.enqueue(task);

	const sessionState = useMemo(() => session.getSnapshot(), [session, tick]);
	const ruleSnapshot = useMemo(() => session.getRuleSnapshot(), [session]);

	useEffect(() => {
		const [primary] = ctx.game.players;
		if (!primary) {
			return;
		}
		const desiredName = playerNameRef.current ?? DEFAULT_PLAYER_NAME;
		if (primary.name === desiredName) {
			return;
		}
		primary.name = desiredName;
		refresh();
	}, [ctx, refresh, playerName]);

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
					pullEffectLog: <T,>(key: string) => session.pullEffectLog<T>(key),
					evaluationMods: session.getPassiveEvaluationMods(),
				},
			),
		[sessionState, session],
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

	const { log, logOverflowed, addLog } = useGameLog({
		sessionState,
	});

	const { resolution, showResolution, acknowledgeResolution } =
		useActionResolution({
			addLog,
			setTrackedTimeout,
			timeScaleRef,
			mountedRef,
		});

	const handleShowResolution = useCallback(
		(options: ShowResolutionOptions) => {
			clearHoverCard();
			return showResolution(options);
		},
		[clearHoverCard, showResolution],
	);

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

	const { toasts, pushToast, pushErrorToast, pushSuccessToast, dismissToast } =
		useToasts({
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
		showResolution: handleShowResolution,
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
		ruleSnapshot,
		log,
		logOverflowed,
		resolution,
		showResolution: handleShowResolution,
		acknowledgeResolution,
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
		backgroundAudioMuted,
		onToggleBackgroundAudioMute,
		timeScale,
		setTimeScale,
		toasts,
		pushToast,
		pushErrorToast,
		pushSuccessToast,
		dismissToast,
		playerName,
		onChangePlayerName,
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

export const useOptionalGameEngine = (): GameEngineContextValue | null =>
	useContext(GameEngineContext);
