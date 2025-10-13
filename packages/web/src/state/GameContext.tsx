/* eslint-disable max-lines */
import React, {
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useRef,
	useState,
} from 'react';
import type { SessionPlayerId } from '@kingdom-builder/protocol/session';
import {
	GameEngineContext,
	GameProviderInner,
	type GameProviderInnerProps,
} from './GameProviderInner';
import { type SessionQueueHelpers, type SessionSnapshot } from './sessionTypes';
import type {
	GameProviderProps,
	LegacyGameEngineContextValue,
	SessionContainer,
} from './GameContext.types';
import { DEFAULT_PLAYER_NAME } from './playerIdentity';
import GameBootstrapScreen from '../components/game/GameBootstrapScreen';
import {
	formatFailureDetails,
	type SessionFailureDetails,
} from './sessionFailures';
import {
	createSession,
	fetchSnapshot,
	releaseSession,
	setSessionDevMode,
	updateSessionPlayerName,
} from './sessionSdk';
import {
	createRemoteSessionQueue,
	type RemoteSessionQueue,
} from './RemoteSessionQueue';

export { TIME_SCALE_OPTIONS } from './useTimeScale';
export type { TimeScale } from './useTimeScale';
export type { PhaseProgressState } from './usePhaseProgress';
export type { TranslationContext } from '../translation/context';

export function GameProvider(props: GameProviderProps) {
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
	const exclusiveQueueRef = useRef<Promise<void>>(Promise.resolve());
	const remoteQueueRef = useRef<RemoteSessionQueue | null>(null);
	const sessionStateRef = useRef<SessionContainer | null>(null);
	const latestSnapshotRef = useRef<SessionSnapshot | null>(null);
	const refreshAbortRef = useRef<AbortController | null>(null);
	const [sessionError, setSessionError] =
		useState<SessionFailureDetails | null>(null);
	const [bootAttempt, setBootAttempt] = useState(0);
	const [sessionData, setSessionData] = useState<SessionContainer | null>(null);
	const playerNameRef = useRef(playerName);
	playerNameRef.current = playerName;

	const updateSessionData = useCallback((next: SessionContainer | null) => {
		sessionStateRef.current = next;
		latestSnapshotRef.current = next?.snapshot ?? null;
		if (next) {
			const currentQueue = remoteQueueRef.current;
			if (!currentQueue || currentQueue.sessionId !== next.sessionId) {
				remoteQueueRef.current = createRemoteSessionQueue({
					sessionId: next.sessionId,
					snapshot: next.snapshot,
					registries: next.registries,
					metadata: next.metadata,
				});
			} else {
				currentQueue.updateState({
					snapshot: next.snapshot,
					registries: next.registries,
					metadata: next.metadata,
				});
			}
		} else {
			remoteQueueRef.current = null;
		}
		if (mountedRef.current) {
			setSessionData(next);
		}
		if (next) {
			setSessionError(null);
		}
	}, []);

	const handleRetry = useCallback(() => {
		setSessionError(null);
		setBootAttempt((value) => value + 1);
	}, []);

	const runExclusive = useCallback(
		<T,>(task: () => Promise<T> | T): Promise<T> => {
			const queue = remoteQueueRef.current;
			if (queue) {
				return queue.enqueue(task);
			}
			const chain = exclusiveQueueRef.current;
			const next = chain.then(() => Promise.resolve().then(task));
			exclusiveQueueRef.current = next.catch(() => {}).then(() => undefined);
			return next;
		},
		[],
	);

	const releaseCurrentSession = useCallback(() => {
		const abortController = refreshAbortRef.current;
		if (abortController) {
			abortController.abort();
			refreshAbortRef.current = null;
		}
		const current = sessionStateRef.current;
		if (!current) {
			return;
		}
		releaseSession(current.sessionId);
		updateSessionData(null);
	}, [updateSessionData]);

	const teardownSession = useCallback(() => {
		void runExclusive(() => {
			releaseCurrentSession();
		});
	}, [releaseCurrentSession, runExclusive]);

	const applyFatalSessionError = useCallback(
		(error: unknown) => {
			releaseCurrentSession();
			if (!mountedRef.current) {
				return;
			}
			setSessionError(formatFailureDetails(error));
		},
		[releaseCurrentSession],
	);

	const handleFatalSessionError = useCallback(
		(error: unknown) => {
			void runExclusive(() => {
				applyFatalSessionError(error);
			});
		},
		[applyFatalSessionError, runExclusive],
	);

	useEffect(
		() => () => {
			mountedRef.current = false;
			teardownSession();
		},
		[teardownSession],
	);

	useEffect(() => {
		let disposed = false;
		const controller = new AbortController();
		setSessionError(null);
		const create = () =>
			runExclusive(async () => {
				if (sessionStateRef.current) {
					return;
				}
				releaseCurrentSession();
				try {
					const created = await createSession(
						{
							devMode,
							playerName: playerNameRef.current,
						},
						{ signal: controller.signal },
					);
					if (disposed || !mountedRef.current) {
						releaseSession(created.sessionId);
						return;
					}
					updateSessionData({
						session: created.session,
						legacySession: created.legacySession,
						sessionId: created.sessionId,
						snapshot: created.snapshot,
						ruleSnapshot: created.ruleSnapshot,
						registries: created.registries,
						resourceKeys: created.resourceKeys,
						metadata: created.metadata,
					});
				} catch (error) {
					if (disposed || !mountedRef.current) {
						return;
					}
					applyFatalSessionError(error);
				}
			});
		void create();
		return () => {
			disposed = true;
			controller.abort();
		};
	}, [
		devMode,
		releaseCurrentSession,
		runExclusive,
		updateSessionData,
		bootAttempt,
		applyFatalSessionError,
	]);

	const refreshSession = useCallback(() => {
		const pending = refreshAbortRef.current;
		if (pending) {
			pending.abort();
			refreshAbortRef.current = null;
		}
		return runExclusive(async () => {
			const current = sessionStateRef.current;
			const sessionId = current?.sessionId;
			if (!sessionId) {
				refreshAbortRef.current = null;
				return;
			}
			const controller = new AbortController();
			refreshAbortRef.current = controller;
			try {
				const result = await fetchSnapshot(sessionId, {
					signal: controller.signal,
				});
				if (
					!mountedRef.current ||
					sessionStateRef.current?.sessionId !== sessionId
				) {
					return;
				}
				updateSessionData({
					session: result.session,
					legacySession: result.legacySession,
					sessionId,
					snapshot: result.snapshot,
					ruleSnapshot: result.ruleSnapshot,
					registries: result.registries,
					resourceKeys: result.resourceKeys,
					metadata: result.metadata,
				});
			} catch (error) {
				if (!mountedRef.current) {
					return;
				}
				if (
					error &&
					typeof error === 'object' &&
					'name' in error &&
					(error as { name?: unknown }).name === 'AbortError'
				) {
					return;
				}
				applyFatalSessionError(error);
			} finally {
				if (refreshAbortRef.current === controller) {
					refreshAbortRef.current = null;
				}
			}
		});
	}, [runExclusive, updateSessionData, applyFatalSessionError]);

	useEffect(() => {
		const current = sessionStateRef.current;
		if (!current) {
			return;
		}
		const currentDevMode = current.snapshot.game.devMode ?? false;
		if (currentDevMode === devMode) {
			return;
		}
		void runExclusive(async () => {
			try {
				const updated = await setSessionDevMode(current.sessionId, devMode);
				if (
					!mountedRef.current ||
					sessionStateRef.current?.sessionId !== current.sessionId
				) {
					return;
				}
				updateSessionData({
					session: updated.session,
					legacySession: updated.legacySession,
					sessionId: current.sessionId,
					snapshot: updated.snapshot,
					ruleSnapshot: updated.ruleSnapshot,
					registries: updated.registries,
					resourceKeys: updated.resourceKeys,
					metadata: updated.metadata,
				});
			} catch (error) {
				if (!mountedRef.current) {
					return;
				}
				applyFatalSessionError(error);
			}
		});
	}, [devMode, runExclusive, updateSessionData, applyFatalSessionError]);

	const handleRelease = useCallback(() => {
		teardownSession();
	}, [teardownSession]);

	const queueHelpers = useMemo<SessionQueueHelpers>(
		() => ({
			enqueue: <T,>(task: () => Promise<T> | T) =>
				runExclusive(() => {
					const current = sessionStateRef.current;
					if (!current) {
						throw new Error('Session not ready');
					}
					return current.session.enqueue(task);
				}),
			getLatestSnapshot: () => {
				const queue = remoteQueueRef.current;
				if (queue) {
					const snapshot = queue.getLatestSnapshot();
					if (snapshot) {
						return snapshot;
					}
				}
				return latestSnapshotRef.current;
			},
			getLatestRegistries: () => {
				const queue = remoteQueueRef.current;
				if (queue) {
					const registries = queue.getLatestRegistries();
					if (registries) {
						return registries;
					}
				}
				const current = sessionStateRef.current;
				return current?.registries ?? null;
			},
			getLatestMetadata: () => {
				const queue = remoteQueueRef.current;
				if (queue) {
					const metadata = queue.getLatestMetadata();
					if (metadata) {
						return metadata;
					}
				}
				const current = sessionStateRef.current;
				return current?.metadata ?? null;
			},
			updatePlayerName: (playerId, playerName) =>
				runExclusive(async () => {
					const current = sessionStateRef.current;
					if (!current) {
						throw new Error('Session not ready');
					}
					try {
						const updated = await updateSessionPlayerName({
							sessionId: current.sessionId,
							playerId: playerId as SessionPlayerId,
							playerName,
						});
						if (
							!mountedRef.current ||
							sessionStateRef.current?.sessionId !== current.sessionId
						) {
							return;
						}
						updateSessionData({
							session: updated.session,
							legacySession: updated.legacySession,
							sessionId: current.sessionId,
							snapshot: updated.snapshot,
							ruleSnapshot: updated.ruleSnapshot,
							registries: updated.registries,
							resourceKeys: updated.resourceKeys,
							metadata: updated.metadata,
						});
					} catch (error) {
						if (!mountedRef.current) {
							return;
						}
						applyFatalSessionError(error);
					}
				}),
		}),
		[runExclusive, applyFatalSessionError, updateSessionData],
	);

	if (!sessionData) {
		const bootstrapProps = {
			error: sessionError,
			onRetry: handleRetry,
		};
		// GameBootstrapScreen owns all bootstrap failure messaging, so
		// callers must propagate fatal errors through
		// handleFatalSessionError to surface diagnostics here.
		return (
			<GameBootstrapScreen
				{...bootstrapProps}
				{...(onExit ? { onExit } : {})}
			/>
		);
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
		queue: queueHelpers,
		sessionId: sessionData.sessionId,
		sessionState: sessionData.snapshot,
		legacySession: sessionData.legacySession,
		ruleSnapshot: sessionData.ruleSnapshot,
		refreshSession,
		onReleaseSession: handleRelease,
		onFatalSessionError: handleFatalSessionError,
		registries: sessionData.registries,
		resourceKeys: sessionData.resourceKeys,
		sessionMetadata: sessionData.metadata,
	};

	if (onExit) {
		innerProps.onExit = onExit;
	}

	return <GameProviderInner {...innerProps} />;
}

export const useGameEngine = (): LegacyGameEngineContextValue => {
	const value = useContext(GameEngineContext);
	if (!value) {
		throw new Error('useGameEngine must be used within GameProvider');
	}
	return value;
};

export const useOptionalGameEngine = (): LegacyGameEngineContextValue | null =>
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

export { useRegistryMetadata } from '../contexts/RegistryMetadataContext';
