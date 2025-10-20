import React, { createContext, useCallback, useMemo, useRef } from 'react';
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
	GameEngineContextValue,
	PerformActionHandler,
	SessionDerivedSelectors,
	SessionMetadataFetchers,
} from './GameContext.types';
import { DEFAULT_PLAYER_NAME } from './playerIdentity';
import { selectSessionView } from './sessionSelectors';
import type { SessionResourceKey } from './sessionTypes';
import { hasAiController } from './sessionAi';
import type { GameProviderInnerProps } from './GameProviderInner.types';
import { useSessionQueue } from './useSessionQueue';
import { useSessionTranslationContext } from './useSessionTranslationContext';
import { useRemotePlayerNameSync } from './useRemotePlayerNameSync';
import { useRunUntilActionPhaseSync } from './useRunUntilActionPhaseSync';

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
	autoAcknowledgeEnabled,
	onToggleAutoAcknowledge = () => {},
	autoPassEnabled,
	onToggleAutoPass = () => {},
	autoAcknowledgeResolutions = autoAcknowledgeEnabled ?? false,
	onToggleAutoAcknowledgeResolutions = onToggleAutoAcknowledge ?? (() => {}),
	autoPassTurn = autoPassEnabled ?? false,
	onToggleAutoPassTurn = onToggleAutoPass ?? (() => {}),
	playerName = DEFAULT_PLAYER_NAME,
	onChangePlayerName = () => {},
	queue,
	sessionId,
	sessionSnapshot,
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
	const { enqueue, cachedSessionSnapshot } = useSessionQueue(
		queue,
		sessionSnapshot,
		sessionId,
	);

	const refresh = useCallback(() => {
		void refreshSession();
	}, [refreshSession]);
	const controlledPlayerSnapshot = useMemo(() => {
		const players = sessionSnapshot.game.players;
		if (!Array.isArray(players) || players.length === 0) {
			return undefined;
		}
		const { activePlayerId, opponentId } = sessionSnapshot.game;
		return (
			players.find((player) => {
				return !hasAiController(sessionId, player.id);
			}) ??
			players.find((player) => player.id === activePlayerId) ??
			players.find((player) => player.id === opponentId) ??
			players[0]
		);
	}, [
		sessionId,
		sessionSnapshot.game.players,
		sessionSnapshot.game.activePlayerId,
		sessionSnapshot.game.opponentId,
	]);
	const controlledPlayerId = controlledPlayerSnapshot?.id;
	const controlledPlayerName = controlledPlayerSnapshot?.name;
	useRemotePlayerNameSync({
		controlledPlayerId,
		controlledPlayerName,
		sessionId,
		enqueue,
		refresh,
		playerNameRef,
		playerName,
	});
	const { translationContext, isReady: translationContextReady } =
		useSessionTranslationContext({
			sessionSnapshot,
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
		sessionSnapshot.actionCostResource;

	const sessionView = useMemo(
		() => selectSessionView(sessionSnapshot, registries),
		[sessionSnapshot, registries],
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
		sessionSnapshot,
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
		runUntilActionPhase,
		runUntilActionPhaseCore,
		handleEndTurn,
		endTurn,
		applyPhaseSnapshot,
		refreshPhaseState,
	} = usePhaseProgress({
		sessionSnapshot,
		sessionId,
		actionCostResource,
		mountedRef,
		refresh,
		resourceKeys,
		enqueue,
		showResolution: handleShowResolution,
		registries,
		onFatalSessionError,
	});

	const { toasts, pushToast, pushErrorToast, pushSuccessToast, dismissToast } =
		useToasts({
			setTrackedTimeout,
		});

	useCompensationLogger({
		sessionId,
		sessionSnapshot,
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
		sessionSnapshot,
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

	useRunUntilActionPhaseSync({
		runUntilActionPhase,
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

	const value: GameEngineContextValue = {
		sessionId,
		sessionSnapshot,
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
		autoAcknowledgeEnabled: autoAcknowledgeEnabled ?? false,
		onToggleAutoAcknowledge: onToggleAutoAcknowledge,
		autoPassEnabled: autoPassEnabled ?? false,
		onToggleAutoPass: onToggleAutoPass,
		autoAcknowledgeResolutions,
		onToggleAutoAcknowledgeResolutions,
		autoPassTurn,
		onToggleAutoPassTurn,
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
