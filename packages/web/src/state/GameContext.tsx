import React, {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useRef,
	useState,
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
import {
	RESOURCE_KEYS,
	SESSION_REGISTRIES,
	TRANSLATION_REGISTRIES,
	type SessionResourceKey,
} from './sessionResources';
import { createSession, fetchSnapshot, releaseSession } from './gameSessionSdk';
import type { CreateSessionResult } from './gameSessionSdk';
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
	const [sessionBundle, setSessionBundle] = useState<CreateSessionResult>(() =>
		createSession({
			devMode,
			playerName: playerNameRef.current ?? DEFAULT_PLAYER_NAME,
		}),
	);
	const session = sessionBundle.session;
	const sessionId = sessionBundle.sessionId;
	const sessionState = sessionBundle.snapshot;
	const ruleSnapshot = sessionBundle.ruleSnapshot;
	const sessionIdRef = useRef(sessionId);
	sessionIdRef.current = sessionId;

	useEffect(() => {
		let cancelled = false;
		const syncSnapshot = async () => {
			const { snapshot, ruleSnapshot: rules } = await fetchSnapshot(session);
			if (cancelled) {
				return;
			}
			setSessionBundle((current) => {
				if (current.sessionId !== sessionId) {
					return current;
				}
				if (current.snapshot === snapshot && current.ruleSnapshot === rules) {
					return current;
				}
				return {
					...current,
					snapshot,
					ruleSnapshot: rules,
				};
			});
		};
		void syncSnapshot();
		return () => {
			cancelled = true;
		};
	}, [session, sessionId]);

	useEffect(
		() => () => {
			void releaseSession(sessionIdRef.current);
		},
		[],
	);

	const devModeRef = useRef(devMode);
	useEffect(() => {
		if (devModeRef.current === devMode) {
			return;
		}
		devModeRef.current = devMode;
		const desiredName = playerNameRef.current ?? DEFAULT_PLAYER_NAME;
		const next = createSession({
			devMode,
			playerName: desiredName,
		});
		setSessionBundle((previous) => {
			void releaseSession(previous.sessionId);
			return next;
		});
	}, [devMode]);

	const refresh = useCallback(async () => {
		const { snapshot, ruleSnapshot: rules } = await fetchSnapshot(session);
		setSessionBundle((current) => {
			if (current.sessionId !== sessionId) {
				return current;
			}
			if (current.snapshot === snapshot && current.ruleSnapshot === rules) {
				return current;
			}
			return {
				...current,
				snapshot,
				ruleSnapshot: rules,
			};
		});
	}, [session, sessionId]);

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
				void refresh();
			});
	}, [session, primaryPlayerId, primaryPlayerName, refresh, playerName]);

	const translationContext = useMemo(
		() =>
			createTranslationContext(
				sessionState,
				TRANSLATION_REGISTRIES,
				{
					pullEffectLog: <T,>(key: string) => session.pullEffectLog<T>(key),
					evaluationMods: session.getPassiveEvaluationMods(),
				},
				{
					ruleSnapshot,
					passiveRecords: sessionState.passiveRecords,
				},
			),
		[sessionState, session, ruleSnapshot, sessionState.passiveRecords],
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
		() => selectSessionView(sessionState, SESSION_REGISTRIES),
		[sessionState],
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

	const exitHandler = useCallback(() => {
		void releaseSession(sessionId);
		if (onExit) {
			onExit();
		}
	}, [onExit, sessionId]);

	const value: GameEngineContextValue = {
		session,
		sessionId,
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
		...(onExit ? { onExit: exitHandler } : {}),
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

export const useSessionView = () => {
	const { sessionView } = useGameEngine();
	return sessionView;
};

export const useSessionPlayers = () => {
	const sessionView = useSessionView();
	return useMemo(
		() => ({
			list: sessionView.list,
			byId: sessionView.byId,
			active: sessionView.active,
			opponent: sessionView.opponent,
		}),
		[sessionView],
	);
};

export const useSessionOptions = () => {
	const sessionView = useSessionView();
	return useMemo(
		() => ({
			actions: sessionView.actions,
			actionList: sessionView.actionList,
			actionsByPlayer: sessionView.actionsByPlayer,
			buildings: sessionView.buildings,
			buildingList: sessionView.buildingList,
			developments: sessionView.developments,
			developmentList: sessionView.developmentList,
		}),
		[sessionView],
	);
};
