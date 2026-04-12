import React, {
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useRef,
	useState,
} from 'react';
import {
	GameProviderInner,
	type GameProviderInnerProps,
} from './GameProviderInner';
import { GameEngineContext } from './GameEngineContext';
import {
	type SessionQueueHelpers,
	type SessionQueueSeed,
	type SessionSnapshot,
} from './sessionTypes';
import type {
	GameEngineContextValue,
	GameProviderProps,
	SessionContainer,
} from './GameContext.types';
import { DEFAULT_PLAYER_NAME } from './playerIdentity';
import GameBootstrapScreen from '../components/game/GameBootstrapScreen';
import {
	formatFailureDetails,
	type SessionFailureDetails,
} from './sessionFailures';
import { createSession, fetchSnapshot, releaseSession } from './sessionSdk';
import { enqueueSessionTask, getSessionRecord } from './sessionStateStore';

const NOOP = () => {};

export { TIME_SCALE_OPTIONS } from './useTimeScale';
export type { TimeScale } from './useTimeScale';
export type { PhaseProgressState } from './usePhaseProgress';
export type { TranslationContext } from '../translation/context';

export function GameProvider(props: GameProviderProps) {
	const {
		children,
		onExit,
		darkMode = true,
		onToggleDark = NOOP,
		contentId,
		musicEnabled = true,
		onToggleMusic = NOOP,
		soundEnabled = true,
		onToggleSound = NOOP,
		backgroundAudioMuted = true,
		onToggleBackgroundAudioMute = NOOP,
		autoAdvanceEnabled = false,
		onToggleAutoAdvance = NOOP,
		playerName = DEFAULT_PLAYER_NAME,
		onChangePlayerName = NOOP,
		resumeSessionId = null,
		onPersistResumeSession = NOOP,
		onClearResumeSession = NOOP,
		onResumeSessionFailure = NOOP,
	} = props;

	const mountedRef = useRef(true);
	const queueRef = useRef<SessionQueueSeed>(Promise.resolve());
	const sessionStateRef = useRef<SessionContainer | null>(null);
	const latestSnapshotRef = useRef<SessionSnapshot | null>(null);
	const lastBootSessionIdRef = useRef<string | null>(null);
	const lastPersistedSessionIdRef = useRef<string | null>(null);
	const refreshAbortRef = useRef<AbortController | null>(null);
	const lastPersistedSessionTurnRef = useRef<number | null>(null);
	const [sessionError, setSessionError] =
		useState<SessionFailureDetails | null>(null);
	const [bootAttempt, setBootAttempt] = useState(0);
	const [sessionData, setSessionData] = useState<SessionContainer | null>(null);
	const playerNameRef = useRef(playerName);
	playerNameRef.current = playerName;

	const updateSessionData = useCallback((next: SessionContainer | null) => {
		sessionStateRef.current = next;
		latestSnapshotRef.current = next?.snapshot ?? null;
		if (mountedRef.current) {
			setSessionData(next);
		}
		if (next) {
			const record = getSessionRecord(next.sessionId);
			if (record) {
				queueRef.current = record.queueSeed;
			}
			lastBootSessionIdRef.current = next.sessionId;
			setSessionError(null);
			return;
		}
		lastBootSessionIdRef.current = null;
		lastPersistedSessionIdRef.current = null;
		lastPersistedSessionTurnRef.current = null;
		queueRef.current = Promise.resolve();
	}, []);

	const handleRetry = useCallback(() => {
		setSessionError(null);
		setBootAttempt((value) => value + 1);
	}, []);

	const runExclusive = useCallback(
		<T,>(task: () => Promise<T> | T): Promise<T> => {
			const chain = queueRef.current;
			const next = chain.then(() => Promise.resolve().then(task));
			queueRef.current = next.catch(() => {}).then(() => undefined);
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

	const handleAbandonSession = useCallback(() => {
		const activeSessionId = sessionStateRef.current?.sessionId ?? null;
		onClearResumeSession(activeSessionId);
	}, [onClearResumeSession]);

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
		if (!sessionData) {
			return;
		}
		const sessionId = sessionData.sessionId;
		const turn = sessionData.snapshot.game.turn ?? 0;
		if (
			sessionId === lastPersistedSessionIdRef.current &&
			turn === lastPersistedSessionTurnRef.current
		) {
			return;
		}
		onPersistResumeSession({
			sessionId,
			turn,
			updatedAt: Date.now(),
		});
		lastPersistedSessionIdRef.current = sessionId;
		lastPersistedSessionTurnRef.current = turn;
	}, [sessionData, onPersistResumeSession]);

	useEffect(() => {
		let disposed = false;
		const targetResumeId = resumeSessionId ?? null;
		const activeSessionId = sessionStateRef.current?.sessionId ?? null;
		if (
			targetResumeId &&
			targetResumeId === activeSessionId &&
			lastBootSessionIdRef.current === activeSessionId
		) {
			return;
		}
		const controller = new AbortController();
		setSessionError(null);
		const bootstrap = () =>
			runExclusive(async () => {
				const targetResumeId = resumeSessionId ?? null;
				const current = sessionStateRef.current;
				if (current) {
					if (!targetResumeId) {
						return;
					}
					if (current.sessionId === targetResumeId) {
						return;
					}
				}
				releaseCurrentSession();
				try {
					if (targetResumeId) {
						const resumed = await fetchSnapshot(targetResumeId, {
							signal: controller.signal,
						});
						if (disposed || !mountedRef.current) {
							releaseSession(resumed.sessionId);
							return;
						}
						const { queueSeed: _queue, ...record } = resumed.record;
						updateSessionData({
							adapter: resumed.adapter,
							...record,
						});
						return;
					}
					const created = await createSession(
						{
							playerName: playerNameRef.current,
							contentId,
						},
						{ signal: controller.signal },
					);
					if (disposed || !mountedRef.current) {
						releaseSession(created.sessionId);
						return;
					}
					const { queueSeed: _queue, ...record } = created.record;
					updateSessionData({
						adapter: created.adapter,
						...record,
					});
				} catch (error) {
					if (disposed || !mountedRef.current) {
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
					if (targetResumeId) {
						onResumeSessionFailure({
							sessionId: targetResumeId,
							error,
						});
						onClearResumeSession(targetResumeId);
					}
					applyFatalSessionError(error);
				}
			});
		void bootstrap();
		return () => {
			disposed = true;
			controller.abort();
		};
	}, [
		resumeSessionId,
		releaseCurrentSession,
		runExclusive,
		updateSessionData,
		bootAttempt,
		applyFatalSessionError,
		onResumeSessionFailure,
		onClearResumeSession,
		contentId,
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
				const currentSnapshot = sessionStateRef.current?.snapshot;
				const latestTurn = currentSnapshot?.game.turn ?? 0;
				const refreshedTurn = result.record.snapshot.game.turn ?? latestTurn;
				if (refreshedTurn < latestTurn) {
					return;
				}
				const { queueSeed: _queue, ...record } = result.record;
				updateSessionData({
					adapter: result.adapter,
					...record,
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
					return enqueueSessionTask(current.sessionId, task);
				}),
			getCurrentSession: () => {
				const current = sessionStateRef.current;
				if (!current) {
					throw new Error('Session not ready');
				}
				return current.adapter;
			},
			getLatestSnapshot: () => latestSnapshotRef.current,
		}),
		[runExclusive],
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
		contentId: contentId ?? null,
		darkMode,
		onToggleDark,
		musicEnabled,
		onToggleMusic,
		soundEnabled,
		onToggleSound,
		backgroundAudioMuted,
		onToggleBackgroundAudioMute,
		autoAdvanceEnabled,
		onToggleAutoAdvance,
		playerName,
		onChangePlayerName,
		queue: queueHelpers,
		sessionId: sessionData.sessionId,
		sessionSnapshot: sessionData.snapshot,
		ruleSnapshot: sessionData.ruleSnapshot,
		refreshSession,
		onReleaseSession: handleRelease,
		onAbandonSession: handleAbandonSession,
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
	const {
		selectors: { sessionView },
	} = useGameEngine();
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
