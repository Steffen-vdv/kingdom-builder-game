import React, { createContext, useCallback, useEffect, useMemo } from 'react';
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
import { isFatalSessionError, markFatalSessionError } from './sessionErrors';
import { useResolutionAutomation } from './useResolutionAutomation';
import { useRemotePlayerNameSync } from './useRemotePlayerNameSync';

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
	onToggleAutoAcknowledge,
	autoPassEnabled,
	onToggleAutoPass,
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
	const { enqueue, cachedSessionSnapshot } = useSessionQueue(
		queue,
		sessionSnapshot,
		sessionId,
	);

	const refresh = useCallback(() => {
		void refreshSession();
	}, [refreshSession]);
	useRemotePlayerNameSync({
		sessionSnapshot,
		sessionId,
		playerName,
		enqueue,
		refresh,
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
			players: sessionSnapshot.game.players,
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

	useResolutionAutomation({
		autoAcknowledgeEnabled,
		autoPassEnabled,
		acknowledgeResolution,
		resolution,
		mountedRef,
		phaseCanEnd: phase.canEndTurn,
		phaseIsAdvancing: phase.isAdvancing,
		advancePhase: requestHelpers.advancePhase,
	});

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
		onToggleAutoAcknowledge: onToggleAutoAcknowledge ?? (() => {}),
		autoPassEnabled: autoPassEnabled ?? false,
		onToggleAutoPass: onToggleAutoPass ?? (() => {}),
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
