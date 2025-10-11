import React, {
	createContext,
	useCallback,
	useEffect,
	useMemo,
	useRef,
} from 'react';
import { createTranslationContext } from '../translation/context';
import { RegistryMetadataProvider } from '../contexts/RegistryMetadataContext';
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

	const { legacySession, enqueue, cachedSessionSnapshot } = useSessionQueue(
		queue,
		sessionState,
	);

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
		void enqueue(() => {
			legacySession.updatePlayerName(primaryPlayerId, desiredName);
		}).finally(() => {
			refresh();
		});
	}, [
		enqueue,
		legacySession,
		primaryPlayerId,
		primaryPlayerName,
		refresh,
		playerName,
	]);

	const translationContext = useMemo(() => {
		const fallbackMetadata = cachedSessionSnapshot.metadata;
		const fallbackModifiers =
			fallbackMetadata?.passiveEvaluationModifiers ?? {};
		const passiveEvaluationModifiers =
			sessionMetadata.passiveEvaluationModifiers ?? fallbackModifiers;
		const fallbackEffectLogs = fallbackMetadata?.effectLogs;
		const effectLogs = sessionMetadata.effectLogs ?? fallbackEffectLogs;
		const metadataPayload = effectLogs
			? {
					passiveEvaluationModifiers,
					effectLogs,
				}
			: { passiveEvaluationModifiers };
		return createTranslationContext(sessionState, registries, metadataPayload, {
			ruleSnapshot,
			passiveRecords: sessionState.passiveRecords,
		});
	}, [
		sessionState,
		registries,
		ruleSnapshot,
		sessionState.passiveRecords,
		sessionMetadata,
		cachedSessionSnapshot,
	]);

	const {
		timeScale,
		setTimeScale,
		clearTrackedTimeout,
		setTrackedTimeout,
		isMountedRef: mountedRef,
		timeScaleRef,
	} = useTimeScale({ devMode });

	const actionCostResource =
		sessionState.actionCostResource as SessionResourceKey;

	const sessionView = useMemo(
		() => selectSessionView(sessionState, registries),
		[sessionState, registries],
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
		session: legacySession,
		sessionState,
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
		session: legacySession,
		sessionState,
		addLog,
		resourceKeys,
		registries,
	});

	const { handlePerform, performRef } = useActionPerformer({
		session: legacySession,
		sessionId,
		actionCostResource,
		registries,
		addLog,
		showResolution: handleShowResolution,
		syncPhaseState: applyPhaseSnapshot,
		refresh,
		pushErrorToast,
		mountedRef,
		endTurn,
		enqueue,
		resourceKeys,
	});

	useAiRunner({
		session: legacySession,
		sessionState,
		runUntilActionPhaseCore,
		syncPhaseState: applyPhaseSnapshot,
		performRef,
		mountedRef,
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
				if (onFatalSessionError) {
					onFatalSessionError(error);
				}
			}
		};
		void run();
		return () => {
			disposed = true;
		};
	}, [runUntilActionPhase, onFatalSessionError]);

	const metadataSnapshot = useMemo(
		() => sessionMetadata ?? cachedSessionSnapshot.metadata,
		[sessionMetadata, cachedSessionSnapshot],
	);

	const metadata = useMemo<SessionMetadataFetchers>(
		() => ({
			getRuleSnapshot: () => ruleSnapshot,
			getSessionView: () => sessionView,
			getTranslationContext: () => translationContext,
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
		session: legacySession,
		sessionState,
		sessionView,
		handlePerform,
		handleEndTurn,
		...(onExit ? { onExit: handleExit } : {}),
	};

	return (
		<RegistryMetadataProvider
			registries={registries}
			metadata={metadataSnapshot}
		>
			<GameEngineContext.Provider value={value}>
				{children}
			</GameEngineContext.Provider>
		</RegistryMetadataProvider>
	);
}
