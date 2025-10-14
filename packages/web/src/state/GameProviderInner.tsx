import React, {
	createContext,
	useCallback,
	useEffect,
	useMemo,
	useRef,
} from 'react';
import { RegistryMetadataProvider } from '../contexts/RegistryMetadataContext';
import TranslationContextLoading from './TranslationContextLoading';
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
import type {
	LegacyGameEngineContextValue,
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
import { isFatalSessionError, markFatalSessionError } from './sessionSdk';
import { createSessionFacade } from './createSessionFacade';

export type { GameProviderInnerProps } from './GameProviderInner.types';

export const GameEngineContext =
	createContext<LegacyGameEngineContextValue | null>(null);

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
	queue,
	sessionId,
	sessionState,
	ruleSnapshot,
	refreshSession,
	onReleaseSession,
	onFatalSessionError,
	registries,
	resourceKeys,
	sessionMetadata,
}: GameProviderInnerProps) {
	const playerNameRef = useRef(playerName);
	playerNameRef.current = playerName;

	const {
		enqueue,
		cachedSessionSnapshot,
		updatePlayerName: syncPlayerName,
	} = useSessionQueue(queue, sessionState);

	const cachedRegistries = queue.getLatestRegistries() ?? registries;
	const cachedMetadata =
		queue.getLatestMetadata() ??
		sessionMetadata ??
		cachedSessionSnapshot.metadata;

	const refresh = useCallback(() => {
		void refreshSession();
	}, [refreshSession]);

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
		void syncPlayerName(primaryPlayerId, desiredName).finally(() => {
			refresh();
		});
	}, [primaryPlayerId, primaryPlayerName, refresh, playerName, syncPlayerName]);

	const { translationContext, isReady: translationContextReady } =
		useSessionTranslationContext({
			sessionState,
			registries: cachedRegistries,
			ruleSnapshot,
			sessionMetadata: cachedMetadata,
			cachedSessionSnapshot,
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
		sessionState.actionCostResource;

	const sessionView = useMemo(
		() => selectSessionView(sessionState, cachedRegistries),
		[sessionState, cachedRegistries],
	);
	const selectors = useMemo<SessionDerivedSelectors>(
		() => ({ sessionView }),
		[sessionView],
	);
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
		phase,
		runUntilActionPhase,
		runUntilActionPhaseCore,
		handleEndTurn,
		endTurn,
		applyPhaseSnapshot,
		refreshPhaseState,
	} = usePhaseProgress({
		sessionState,
		sessionId,
		actionCostResource,
		mountedRef,
		refresh,
		resourceKeys,
		enqueue,
		showResolution: handleShowResolution,
		registries: cachedRegistries,
		getLatestSnapshot: queue.getLatestSnapshot,
		onFatalSessionError,
	});

	const { toasts, pushToast, pushErrorToast, pushSuccessToast, dismissToast } =
		useToasts({
			setTrackedTimeout,
		});

	useCompensationLogger({
		sessionId,
		sessionState,
		addLog,
		resourceKeys,
		registries: cachedRegistries,
	});

	const { handlePerform } = useActionPerformer({
		sessionId,
		actionCostResource,
		registries: cachedRegistries,
		queue,
		cachedSessionSnapshot,
		addLog,
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
		enqueue,
		getLatestSnapshot: queue.getLatestSnapshot,
		sessionState,
		runUntilActionPhaseCore,
		mountedRef,
		...(onFatalSessionError ? { onFatalSessionError } : {}),
	});

	useEffect(() => {
		let disposed = false;
		const run = async () => {
			try {
				await runUntilActionPhase();
			} catch (error) {
				if (disposed) {
					return;
				}
				if (!onFatalSessionError) {
					return;
				}
				if (isFatalSessionError(error)) {
					return;
				}
				markFatalSessionError(error);
				onFatalSessionError(error);
			}
		};
		void run();
		return () => {
			disposed = true;
		};
	}, [runUntilActionPhase, onFatalSessionError]);

	const metadataSnapshot = cachedMetadata;

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

	const {
		actions: sessionActionRegistry,
		buildings: sessionBuildingRegistry,
		developments: sessionDevelopmentRegistry,
		populations: sessionPopulationRegistry,
	} = cachedRegistries;
	const sessionFacade = useMemo(
		() =>
			createSessionFacade({
				sessionState,
				registries: {
					actions: sessionActionRegistry,
					buildings: sessionBuildingRegistry,
					developments: sessionDevelopmentRegistry,
					populations: sessionPopulationRegistry,
				},
			}),
		[
			sessionState,
			sessionActionRegistry,
			sessionBuildingRegistry,
			sessionDevelopmentRegistry,
			sessionPopulationRegistry,
		],
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
			refreshSession,
		}),
		[performActionRequest, handleEndTurn, refreshSession],
	);

	const handleExit = useCallback(() => {
		onReleaseSession();
		if (onExit) {
			onExit();
		}
	}, [onReleaseSession, onExit]);

	if (!translationContextReady || !translationContext) {
		return <TranslationContextLoading />;
	}

	const value: LegacyGameEngineContextValue = {
		sessionId,
		sessionSnapshot: sessionState,
		cachedSessionSnapshot,
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
		session: sessionFacade,
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
		timeScale,
		setTimeScale,
		toasts,
		pushToast,
		pushErrorToast,
		pushSuccessToast,
		dismissToast,
		playerName,
		onChangePlayerName,
		sessionState,
		sessionView,
		handlePerform,
		handleEndTurn,
		...(onExit ? { onExit: handleExit } : {}),
	};

	return (
		<RegistryMetadataProvider
			registries={cachedRegistries}
			metadata={metadataSnapshot}
		>
			<GameEngineContext.Provider value={value}>
				{children}
			</GameEngineContext.Provider>
		</RegistryMetadataProvider>
	);
}
