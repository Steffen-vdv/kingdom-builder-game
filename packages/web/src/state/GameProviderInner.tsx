import React, {
	createContext,
	useCallback,
	useEffect,
	useMemo,
	useRef,
} from 'react';
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
import type { GameEngineContextValue } from './GameContext.types';
import { DEFAULT_PLAYER_NAME } from './playerIdentity';
import { selectSessionView } from './sessionSelectors';
import { type CreateSessionResult } from './sessionSdk';

export type Session = CreateSessionResult['session'];
export type SessionSnapshot = CreateSessionResult['snapshot'];
export type SessionRuleSnapshot = CreateSessionResult['ruleSnapshot'];
export type SessionRegistries = CreateSessionResult['registries'];
export type SessionResourceKeys = CreateSessionResult['resourceKeys'];
export type SessionResourceKey = SessionResourceKeys[number];

export interface GameProviderInnerProps {
	children: React.ReactNode;
	onExit?: () => void;
	darkMode: boolean;
	onToggleDark: () => void;
	devMode: boolean;
	musicEnabled: boolean;
	onToggleMusic: () => void;
	soundEnabled: boolean;
	onToggleSound: () => void;
	backgroundAudioMuted: boolean;
	onToggleBackgroundAudioMute: () => void;
	playerName: string;
	onChangePlayerName: (name: string) => void;
	session: Session;
	sessionId: string;
	sessionState: SessionSnapshot;
	ruleSnapshot: SessionRuleSnapshot;
	refreshSession: () => Promise<void>;
	onReleaseSession: () => void;
	registries: SessionRegistries;
	resourceKeys: SessionResourceKeys;
}

export const GameEngineContext = createContext<GameEngineContextValue | null>(
	null,
);

export function GameProviderInner({
	children,
	onExit,
	darkMode,
	onToggleDark,
	devMode,
	musicEnabled,
	onToggleMusic,
	soundEnabled,
	onToggleSound,
	backgroundAudioMuted,
	onToggleBackgroundAudioMute,
	playerName = DEFAULT_PLAYER_NAME,
	onChangePlayerName = () => {},
	session,
	sessionId,
	sessionState,
	ruleSnapshot,
	refreshSession,
	onReleaseSession,
	registries,
	resourceKeys,
}: GameProviderInnerProps) {
	const playerNameRef = useRef(playerName);
	playerNameRef.current = playerName;

	const refresh = useCallback(() => {
		void refreshSession();
	}, [refreshSession]);

	const enqueue = useCallback(
		<T,>(task: () => Promise<T> | T) => session.enqueue(task),
		[session],
	);

	const primaryPlayerSnapshot = sessionState.game.players[0];
	const primaryPlayerId = primaryPlayerSnapshot?.id;
	const primaryPlayerName = primaryPlayerSnapshot?.name;
	useEffect(() => {
		const desiredName = playerNameRef.current ?? DEFAULT_PLAYER_NAME;
		if (
			primaryPlayerId === undefined ||
			primaryPlayerName === undefined ||
			primaryPlayerName === desiredName
		) {
			return;
		}
		void session
			.enqueue(() => {
				session.updatePlayerName(primaryPlayerId, desiredName);
			})
			.finally(() => {
				refresh();
			});
	}, [session, primaryPlayerId, primaryPlayerName, refresh, playerName]);

	const translationContext = useMemo(
		() =>
			createTranslationContext(
				sessionState,
				registries,
				{
					pullEffectLog: <T,>(key: string) => session.pullEffectLog<T>(key),
					evaluationMods: session.getPassiveEvaluationMods(),
				},
				{
					ruleSnapshot,
					passiveRecords: sessionState.passiveRecords,
				},
			),
		[
			sessionState,
			registries,
			session,
			ruleSnapshot,
			sessionState.passiveRecords,
		],
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

	const actionCostResource =
		sessionState.actionCostResource as SessionResourceKey;

	const sessionView = useMemo(
		() => selectSessionView(sessionState, registries),
		[sessionState, registries],
	);

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
	});

	const { toasts, pushToast, pushErrorToast, pushSuccessToast, dismissToast } =
		useToasts({
			setTrackedTimeout,
		});

	useCompensationLogger({
		session,
		sessionState,
		addLog,
		resourceKeys,
	});

	const { handlePerform, performRef } = useActionPerformer({
		session,
		sessionId,
		actionCostResource,
		addLog,
		showResolution: handleShowResolution,
		updateMainPhaseStep,
		refresh,
		pushErrorToast,
		mountedRef,
		endTurn,
		enqueue,
		resourceKeys,
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

	const handleExit = useCallback(() => {
		onReleaseSession();
		if (onExit) {
			onExit();
		}
	}, [onReleaseSession, onExit]);

	const value: GameEngineContextValue = {
		session,
		sessionState,
		sessionView,
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
		darkMode: darkMode ?? true,
		onToggleDark: onToggleDark ?? (() => {}),
		musicEnabled: musicEnabled ?? true,
		onToggleMusic: onToggleMusic ?? (() => {}),
		soundEnabled: soundEnabled ?? true,
		onToggleSound: onToggleSound ?? (() => {}),
		backgroundAudioMuted: backgroundAudioMuted ?? true,
		onToggleBackgroundAudioMute: onToggleBackgroundAudioMute ?? (() => {}),
		timeScale,
		setTimeScale,
		toasts,
		pushToast,
		pushErrorToast,
		pushSuccessToast,
		dismissToast,
		playerName,
		onChangePlayerName,
		...(onExit ? { onExit: handleExit } : {}),
	};

	return (
		<GameEngineContext.Provider value={value}>
			{children}
		</GameEngineContext.Provider>
	);
}
