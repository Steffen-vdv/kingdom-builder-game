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
import { updatePlayerName as updateRemotePlayerName } from './sessionSdk';
import { isFatalSessionError, markFatalSessionError } from './sessionErrors';

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
		adapter: sessionAdapter,
		enqueue,
		cachedSessionSnapshot,
	} = useSessionQueue(queue, sessionState, sessionId);

	const refresh = useCallback(() => {
		void refreshSession();
	}, [refreshSession]);
	const controlledPlayerSnapshot = useMemo(() => {
		const players = sessionState.game.players;
		if (!Array.isArray(players) || players.length === 0) {
			return undefined;
		}
		const { activePlayerId, opponentId } = sessionState.game;
		return (
			players.find((player) => {
				return !sessionAdapter.hasAiController(player.id);
			}) ??
			players.find((player) => player.id === activePlayerId) ??
			players.find((player) => player.id === opponentId) ??
			players[0]
		);
	}, [
		sessionAdapter,
		sessionState.game.players,
		sessionState.game.activePlayerId,
		sessionState.game.opponentId,
	]);
	const controlledPlayerId = controlledPlayerSnapshot?.id;
	const controlledPlayerName = controlledPlayerSnapshot?.name;
	useEffect(() => {
		const desiredName = playerNameRef.current ?? DEFAULT_PLAYER_NAME;
		if (
			controlledPlayerId === undefined ||
			controlledPlayerName === undefined ||
			controlledPlayerName === desiredName
		) {
			return;
		}
		void enqueue(() =>
			updateRemotePlayerName({
				sessionId,
				playerId: controlledPlayerId,
				playerName: desiredName,
			}),
		).finally(() => {
			refresh();
		});
	}, [
		enqueue,
		controlledPlayerId,
		controlledPlayerName,
		refresh,
		playerName,
		sessionId,
	]);
	const { translationContext, isReady: translationContextReady } =
		useSessionTranslationContext({
			sessionState,
			registries,
			ruleSnapshot,
			sessionMetadata,
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
		sessionId,
		sessionState,
		addLog,
		resourceKeys,
		registries,
	});

	const { handlePerform } = useActionPerformer({
		session: sessionAdapter,
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
		...(onFatalSessionError ? { onFatalSessionError } : {}),
	});

	useAiRunner({
		session: sessionAdapter,
		sessionState,
		runUntilActionPhaseCore,
		syncPhaseState: applyPhaseSnapshot,
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

	const metadataSnapshot = useMemo(
		() => sessionMetadata ?? cachedSessionSnapshot.metadata,
		[sessionMetadata, cachedSessionSnapshot],
	);

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

	const value: LegacyGameEngineContextValue = {
		sessionId,
		sessionSnapshot: sessionState,
		cachedSessionSnapshot,
		selectors,
		controlledPlayerId: controlledPlayerId ?? null,
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
		session: sessionAdapter,
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
