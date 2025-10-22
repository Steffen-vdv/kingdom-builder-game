import React, {
	createContext,
	useCallback,
	useEffect,
	useMemo,
	useState,
} from 'react';
import { RegistryMetadataProvider } from '../contexts/RegistryMetadataContext';
import TranslationContextLoading from './TranslationContextLoading';
import { useTimeScale } from './useTimeScale';
import { useHoverCard } from './useHoverCard';
import { useGameLog } from './useGameLog';
import {
	useActionResolution,
	type ShowResolutionOptions,
} from './useActionResolution';
import { usePhaseProgress } from './usePhaseProgress';
import { useActionPerformer } from './useActionPerformer';
import { useToasts } from './useToasts';
import { useCompensationLogger } from './useCompensationLogger';
import { useAiRunner } from './useAiRunner';
import { useKeybindingPreferences } from './keybindings';
import type {
	GameEngineContextValue,
	PerformActionHandler,
	SessionDerivedSelectors,
	SessionMetadataFetchers,
} from './GameContext.types';
import { DEFAULT_PLAYER_NAME } from './playerIdentity';
import { selectSessionView } from './sessionSelectors';
import type { SessionResourceKey } from './sessionTypes';
import type { GameProviderInnerProps } from './GameProviderInner.types';
import { useSessionQueue } from './useSessionQueue';
import { useSessionTranslationContext } from './useSessionTranslationContext';
import { useManualSessionStart } from './useManualSessionStart';
import { useResolutionAutomation } from './useResolutionAutomation';
import { useRemotePlayerNameSync } from './useRemotePlayerNameSync';
import GameSessionLoadingScreen from '../components/game/GameSessionLoadingScreen';

export type { GameProviderInnerProps } from './GameProviderInner.types';

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
	autoAdvanceEnabled,
	onToggleAutoAdvance,
	playerName = DEFAULT_PLAYER_NAME,
	onChangePlayerName = () => {},
	queue,
	sessionId,
	sessionSnapshot,
	ruleSnapshot,
	refreshSession,
	onReleaseSession,
	onAbandonSession,
	onFatalSessionError,
	registries,
	resourceKeys,
	sessionMetadata,
}: GameProviderInnerProps) {
	const { enqueue } = useSessionQueue(queue, sessionSnapshot, sessionId);
	const [liveSessionSnapshot, setLiveSessionSnapshot] =
		useState(sessionSnapshot);
	useEffect(() => {
		setLiveSessionSnapshot(sessionSnapshot);
	}, [sessionSnapshot]);
	const refresh = useCallback(() => {
		void refreshSession();
	}, [refreshSession]);
	useRemotePlayerNameSync({
		sessionSnapshot: liveSessionSnapshot,
		sessionId,
		playerName,
		enqueue,
		refresh,
	});
	const { translationContext, isReady: translationContextReady } =
		useSessionTranslationContext({
			sessionSnapshot: liveSessionSnapshot,
			registries,
			ruleSnapshot,
			sessionMetadata,
			onFatalSessionError,
		});

	const {
		timeScale,
		setTimeScale,
		clearTrackedTimeout,
		setTrackedTimeout,
		isMountedRef: mountedRef,
		timeScaleRef,
	} = useTimeScale({ devMode });

	const actionCostResource: SessionResourceKey =
		liveSessionSnapshot.actionCostResource;

	const sessionView = useMemo(
		() => selectSessionView(liveSessionSnapshot, registries),
		[liveSessionSnapshot, registries],
	);
	const selectors = useMemo<SessionDerivedSelectors>(
		() => ({ sessionView }),
		[sessionView],
	);
	const { hoverCard, handleHoverCard, clearHoverCard } = useHoverCard({
		setTrackedTimeout,
		clearTrackedTimeout,
	});

	const { log, logOverflowed, addResolutionLog } = useGameLog({
		sessionSnapshot: liveSessionSnapshot,
	});

	const { resolution, showResolution, acknowledgeResolution } =
		useActionResolution({
			addResolutionLog,
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
		phase,
		initializing,
		runUntilActionPhase,
		runUntilActionPhaseCore,
		handleEndTurn,
		endTurn,
		applyPhaseSnapshot,
		refreshPhaseState,
		startSession,
	} = usePhaseProgress({
		sessionSnapshot: liveSessionSnapshot,
		sessionId,
		actionCostResource,
		mountedRef,
		refresh,
		resourceKeys,
		enqueue,
		showResolution: handleShowResolution,
		registries,
		onFatalSessionError,
		onSnapshotApplied: setLiveSessionSnapshot,
	});

	const { handleStartSession } = useManualSessionStart({
		phase,
		runUntilActionPhase,
		startSession,
		onFatalSessionError,
	});

	const { toasts, pushToast, pushErrorToast, pushSuccessToast, dismissToast } =
		useToasts({
			setTrackedTimeout,
		});

	const {
		keybinds: controlKeybinds,
		setControlKeybind,
		resetControlKeybind,
	} = useKeybindingPreferences();

	useCompensationLogger({
		sessionId,
		sessionSnapshot: liveSessionSnapshot,
		addResolutionLog,
		resourceKeys,
		registries,
	});

	const { handlePerform } = useActionPerformer({
		sessionId,
		actionCostResource,
		registries,
		addResolutionLog,
		showResolution: handleShowResolution,
		syncPhaseState: applyPhaseSnapshot,
		refresh,
		pushErrorToast,
		mountedRef,
		endTurn,
		enqueue,
		resourceKeys,
		...(onFatalSessionError ? { onFatalSessionError } : {}),
	});

	useAiRunner({
		sessionId,
		sessionSnapshot: liveSessionSnapshot,
		runUntilActionPhaseCore,
		syncPhaseState: applyPhaseSnapshot,
		mountedRef,
		showResolution: handleShowResolution,
		addResolutionLog,
		registries,
		resourceKeys,
		actionCostResource,
		...(onFatalSessionError ? { onFatalSessionError } : {}),
	});

	const metadata = useMemo<SessionMetadataFetchers>(
		() => ({
			getRuleSnapshot: () => ruleSnapshot,
			getSessionView: () => sessionView,
			getTranslationContext: () => {
				if (!translationContext) {
					throw new Error('Translation context unavailable');
				}
				return translationContext;
			},
		}),
		[ruleSnapshot, sessionView, translationContext],
	);

	const performActionRequest = useCallback<PerformActionHandler>(
		async ({ action, params }) => {
			await handlePerform(action, params);
		},
		[handlePerform],
	);

	const requestHelpers = useMemo(
		() => ({
			performAction: performActionRequest,
			advancePhase: handleEndTurn,
			startSession: handleStartSession,
			refreshSession,
		}),
		[performActionRequest, handleEndTurn, handleStartSession, refreshSession],
	);

	useResolutionAutomation({
		autoAdvanceEnabled,
		acknowledgeResolution,
		resolution,
		mountedRef,
		phaseCanEnd: phase.canEndTurn,
		phaseIsAdvancing: phase.isAdvancing,
		advancePhase: requestHelpers.advancePhase,
	});

	const handleExit = useCallback(() => {
		if (onAbandonSession) {
			onAbandonSession();
		}
		onReleaseSession();
		if (onExit) {
			onExit();
		}
	}, [onAbandonSession, onReleaseSession, onExit]);
	if (!translationContextReady || !translationContext) {
		return <TranslationContextLoading />;
	}
	if (initializing) {
		return <GameSessionLoadingScreen />;
	}
	const value: GameEngineContextValue = {
		sessionId,
		sessionSnapshot: liveSessionSnapshot,
		cachedSessionSnapshot: liveSessionSnapshot,
		selectors,
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
		phase,
		actionCostResource,
		requests: requestHelpers,
		metadata,
		runUntilActionPhase,
		refreshPhaseState,
		darkMode: darkMode ?? true,
		onToggleDark: onToggleDark ?? (() => {}),
		musicEnabled: musicEnabled ?? true,
		onToggleMusic: onToggleMusic ?? (() => {}),
		soundEnabled: soundEnabled ?? true,
		onToggleSound: onToggleSound ?? (() => {}),
		backgroundAudioMuted: backgroundAudioMuted ?? true,
		onToggleBackgroundAudioMute: onToggleBackgroundAudioMute ?? (() => {}),
		autoAdvanceEnabled: autoAdvanceEnabled ?? false,
		onToggleAutoAdvance: onToggleAutoAdvance ?? (() => {}),
		timeScale,
		setTimeScale,
		controlKeybinds,
		setControlKeybind,
		resetControlKeybind,
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
		<RegistryMetadataProvider
			registries={registries}
			metadata={sessionMetadata}
		>
			<GameEngineContext.Provider value={value}>
				{children}
			</GameEngineContext.Provider>
		</RegistryMetadataProvider>
	);
}
