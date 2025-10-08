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
import type { SessionRegistries } from './sessionSelectors.types';
import {
	createSession as sdkCreateSession,
	fetchSnapshot as sdkFetchSnapshot,
	releaseSession as sdkReleaseSession,
	RESOURCE_KEYS as SDK_RESOURCE_KEYS,
	REGISTRIES as SDK_REGISTRIES,
	CONTENT_REGISTRIES as SDK_CONTENT_REGISTRIES,
	type EngineSession,
	type EngineSessionSnapshot,
	type ResourceKey,
	type ContentRegistries,
} from './sessionSdk';
export { TIME_SCALE_OPTIONS } from './useTimeScale';
export type { TimeScale } from './useTimeScale';
export type { PhaseStep } from './phaseTypes';

const GameEngineContext = createContext<GameEngineContextValue | null>(null);

interface ReadyState {
	sessionId: string;
	session: EngineSession;
	registries: SessionRegistries;
	resourceKeys: ResourceKey[];
	contentRegistries: ContentRegistries;
	initialSnapshot: EngineSessionSnapshot;
}

interface GameProviderProps {
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
}

function GameProviderReady({
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
	sessionId,
	session,
	registries,
	resourceKeys,
	contentRegistries,
	initialSnapshot,
	releaseSession,
}: GameProviderProps &
	ReadyState & {
		releaseSession: () => Promise<void>;
	}) {
	const [sessionState, setSessionState] = useState(initialSnapshot);
	const [ruleSnapshot, setRuleSnapshot] = useState(initialSnapshot.rules);
	const playerNameRef = useRef(playerName);
	playerNameRef.current = playerName;

	useEffect(() => {
		setSessionState(initialSnapshot);
		setRuleSnapshot(initialSnapshot.rules);
	}, [initialSnapshot]);

	const refresh = useCallback(async () => {
		const { snapshot } = await sdkFetchSnapshot(sessionId);
		setSessionState(snapshot);
		setRuleSnapshot(snapshot.rules);
	}, [sessionId]);

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
	}, [session, primaryPlayerId, primaryPlayerName, refresh]);

	const translationContext = useMemo(
		() =>
			createTranslationContext(
				sessionState,
				contentRegistries,
				{
					pullEffectLog: <T,>(key: string) => session.pullEffectLog<T>(key),
					evaluationMods: session.getPassiveEvaluationMods(),
				},
				{
					ruleSnapshot,
					passiveRecords: sessionState.passiveRecords,
				},
			),
		[sessionState, contentRegistries, session, ruleSnapshot],
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
		void releaseSession();
		onExit?.();
	}, [releaseSession, onExit]);

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
		...(onExit ? { onExit: handleExit } : {}),
	};

	return (
		<GameEngineContext.Provider value={value}>
			{children}
		</GameEngineContext.Provider>
	);
}

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
}: GameProviderProps) {
	const playerNameRef = useRef(playerName);
	playerNameRef.current = playerName;
	const [readyState, setReadyState] = useState<ReadyState | null>(null);
	const sessionIdRef = useRef<string | null>(null);

	const releaseCurrentSession = useCallback(async () => {
		if (!sessionIdRef.current) {
			return;
		}
		const sessionId = sessionIdRef.current;
		sessionIdRef.current = null;
		await sdkReleaseSession(sessionId);
	}, []);

	useEffect(() => {
		let cancelled = false;
		const initialize = async () => {
			await releaseCurrentSession();
			setReadyState(null);
			const created = await sdkCreateSession({
				devMode,
				playerName: playerNameRef.current ?? DEFAULT_PLAYER_NAME,
			});
			if (cancelled) {
				await sdkReleaseSession(created.sessionId);
				return;
			}
			sessionIdRef.current = created.sessionId;
			setReadyState({
				sessionId: created.sessionId,
				session: created.session,
				registries: created.registries ?? SDK_REGISTRIES,
				resourceKeys: created.resourceKeys ?? SDK_RESOURCE_KEYS,
				contentRegistries: created.contentRegistries ?? SDK_CONTENT_REGISTRIES,
				initialSnapshot: created.snapshot,
			});
		};
		void initialize();
		return () => {
			cancelled = true;
			void releaseCurrentSession();
		};
	}, [devMode, releaseCurrentSession]);

	if (!readyState) {
		return null;
	}

	return (
		<GameProviderReady
			sessionId={readyState.sessionId}
			session={readyState.session}
			registries={readyState.registries}
			resourceKeys={readyState.resourceKeys}
			contentRegistries={readyState.contentRegistries}
			initialSnapshot={readyState.initialSnapshot}
			releaseSession={releaseCurrentSession}
			{...(onExit ? { onExit } : {})}
			darkMode={darkMode}
			onToggleDark={onToggleDark}
			devMode={devMode}
			musicEnabled={musicEnabled}
			onToggleMusic={onToggleMusic}
			soundEnabled={soundEnabled}
			onToggleSound={onToggleSound}
			backgroundAudioMuted={backgroundAudioMuted}
			onToggleBackgroundAudioMute={onToggleBackgroundAudioMute}
			playerName={playerName}
			onChangePlayerName={onChangePlayerName}
		>
			{children}
		</GameProviderReady>
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
