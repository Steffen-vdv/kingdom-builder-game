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
	createSession,
	fetchSnapshot,
	releaseSession,
	type CreateSessionResult,
} from './sessionSdk';

export { TIME_SCALE_OPTIONS } from './useTimeScale';
export type { TimeScale } from './useTimeScale';
export type { PhaseStep } from './phaseTypes';
export type { TranslationContext } from '../translation/context';

const GameEngineContext = createContext<GameEngineContextValue | null>(null);

type Session = CreateSessionResult['session'];
type SessionSnapshot = CreateSessionResult['snapshot'];
type SessionRuleSnapshot = CreateSessionResult['ruleSnapshot'];
type SessionRegistries = CreateSessionResult['registries'];
type SessionResourceKeys = CreateSessionResult['resourceKeys'];
type SessionResourceKey = SessionResourceKeys[number];

type ProviderProps = {
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
};

interface SessionContainer {
	session: Session;
	sessionId: string;
	snapshot: SessionSnapshot;
	ruleSnapshot: SessionRuleSnapshot;
	registries: SessionRegistries;
	resourceKeys: SessionResourceKeys;
}

interface GameProviderInnerProps {
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

function GameProviderInner({
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

export function GameProvider(props: ProviderProps) {
	const {
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
	} = props;

	const mountedRef = useRef(true);
	const sessionRef = useRef<Session | null>(null);
	const sessionIdRef = useRef<string | null>(null);
	const [sessionData, setSessionData] = useState<SessionContainer | null>(null);
	const playerNameRef = useRef(playerName);
	playerNameRef.current = playerName;

	const teardownSession = useCallback(() => {
		const currentId = sessionIdRef.current;
		if (currentId) {
			releaseSession(currentId);
		}
		sessionIdRef.current = null;
		sessionRef.current = null;
		if (mountedRef.current) {
			setSessionData(null);
		}
	}, [mountedRef]);

	useEffect(
		() => () => {
			mountedRef.current = false;
			teardownSession();
		},
		[teardownSession],
	);

	useEffect(() => {
		let disposed = false;
		const create = async () => {
			const previousId = sessionIdRef.current;
			if (previousId) {
				releaseSession(previousId);
			}
			sessionIdRef.current = null;
			sessionRef.current = null;
			setSessionData(null);
			const created = await createSession({
				devMode,
				playerName: playerNameRef.current,
			});
			if (disposed || !mountedRef.current) {
				releaseSession(created.sessionId);
				return;
			}
			sessionRef.current = created.session;
			sessionIdRef.current = created.sessionId;
			setSessionData({
				session: created.session,
				sessionId: created.sessionId,
				snapshot: created.snapshot,
				ruleSnapshot: created.ruleSnapshot,
				registries: created.registries,
				resourceKeys: created.resourceKeys,
			});
		};
		void create();
		return () => {
			disposed = true;
		};
	}, [devMode]);

	const refreshSession = useCallback(async () => {
		const sessionId = sessionIdRef.current;
		if (!sessionId) {
			return;
		}
		const result = await fetchSnapshot(sessionId);
		if (!mountedRef.current || sessionIdRef.current !== sessionId) {
			return;
		}
		sessionRef.current = result.session;
		setSessionData({
			session: result.session,
			sessionId,
			snapshot: result.snapshot,
			ruleSnapshot: result.ruleSnapshot,
			registries: result.registries,
			resourceKeys: result.resourceKeys,
		});
	}, []);

	const handleRelease = useCallback(() => {
		teardownSession();
	}, [teardownSession]);

	if (!sessionData || !sessionRef.current) {
		return null;
	}

	const innerProps: GameProviderInnerProps = {
		children,
		darkMode,
		onToggleDark,
		devMode,
		musicEnabled,
		onToggleMusic,
		soundEnabled,
		onToggleSound,
		backgroundAudioMuted,
		onToggleBackgroundAudioMute,
		playerName,
		onChangePlayerName,
		session: sessionRef.current,
		sessionId: sessionData.sessionId,
		sessionState: sessionData.snapshot,
		ruleSnapshot: sessionData.ruleSnapshot,
		refreshSession,
		onReleaseSession: handleRelease,
		registries: sessionData.registries,
		resourceKeys: sessionData.resourceKeys,
	};

	if (onExit) {
		innerProps.onExit = onExit;
	}

	return <GameProviderInner {...innerProps} />;
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
