import React, {
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useRef,
	useState,
	type MutableRefObject,
} from 'react';
import {
	GameEngineContext,
	GameProviderInner,
	type GameProviderInnerProps,
} from './GameProviderInner';
import { type SessionQueueHelpers, type SessionSnapshot } from './sessionTypes';
import type { LegacyGameEngineContextValue } from './GameContext.types';
import { DEFAULT_PLAYER_NAME } from './playerIdentity';
import GameBootstrapScreen from '../components/game/GameBootstrapScreen';
import {
	formatFailureDetails,
	type SessionFailureDetails,
} from './sessionFailures';
import { releaseSession, type CreateSessionResult } from './sessionSdk';
import { useSessionCreation, useSessionRefresh } from './useSessionRequests';

export { TIME_SCALE_OPTIONS } from './useTimeScale';
export type { TimeScale } from './useTimeScale';
export type { PhaseProgressState } from './usePhaseProgress';
export type { TranslationContext } from '../translation/context';

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

type SessionContainer = CreateSessionResult;

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
	const queueRef = useRef<Promise<void>>(Promise.resolve());
	const sessionStateRef = useRef<SessionContainer | null>(null);
	const latestSnapshotRef = useRef<SessionSnapshot | null>(null);
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
			setSessionError(null);
		}
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
		const current = sessionStateRef.current;
		if (!current) {
			return;
		}
		releaseSession(current.sessionId);
		updateSessionData(null);
	}, [updateSessionData]);

	const { refreshSession, teardownSession } = useSessionRefresh({
		runExclusive,
		sessionStateRef: sessionStateRef as MutableRefObject<{
			sessionId: string;
		} | null>,
		mountedRef,
		updateSessionData,
		releaseCurrentSession,
		setSessionError,
	});

	const handleFatalSessionError = useCallback(
		(error: unknown) => {
			void runExclusive(() => {
				releaseCurrentSession();
				if (!mountedRef.current) {
					return;
				}
				setSessionError(formatFailureDetails(error));
			});
		},
		[runExclusive, releaseCurrentSession],
	);

	useEffect(
		() => () => {
			mountedRef.current = false;
			teardownSession();
		},
		[teardownSession],
	);

	useSessionCreation({
		devMode,
		playerNameRef,
		runExclusive,
		releaseCurrentSession,
		updateSessionData,
		setSessionError,
		bootAttempt,
		mountedRef,
	});

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
			getCurrentSession: () => {
				const current = sessionStateRef.current;
				if (!current) {
					throw new Error('Session not ready');
				}
				return current.session;
			},
			getLegacySession: () => {
				const current = sessionStateRef.current;
				if (!current) {
					throw new Error('Session not ready');
				}
				return current.legacySession;
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
