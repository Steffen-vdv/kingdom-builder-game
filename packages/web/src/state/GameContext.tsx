import React, {
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useRef,
	useState,
} from 'react';
import {
	GameEngineContext,
	GameProviderInner,
	type GameProviderInnerProps,
} from './GameProviderInner';
import {
	type SessionQueueHelpers,
	type Session,
	type LegacySession,
	type SessionRegistries,
	type SessionResourceKeys,
	type SessionRuleSnapshot,
	type SessionSnapshot,
	type SessionMetadata,
} from './sessionTypes';
import type { LegacyGameEngineContextValue } from './GameContext.types';
import { DEFAULT_PLAYER_NAME } from './playerIdentity';
import { createSession, fetchSnapshot, releaseSession } from './sessionSdk';

export { TIME_SCALE_OPTIONS } from './useTimeScale';
export type { TimeScale } from './useTimeScale';
export type { PhaseStep } from './GameContext.types';
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

interface SessionContainer {
	session: Session;
	legacySession: LegacySession;
	sessionId: string;
	snapshot: SessionSnapshot;
	ruleSnapshot: SessionRuleSnapshot;
	registries: SessionRegistries;
	resourceKeys: SessionResourceKeys;
	metadata: SessionMetadata;
}

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
	const [sessionData, setSessionData] = useState<SessionContainer | null>(null);
	const playerNameRef = useRef(playerName);
	playerNameRef.current = playerName;

	const updateSessionData = useCallback((next: SessionContainer | null) => {
		sessionStateRef.current = next;
		latestSnapshotRef.current = next?.snapshot ?? null;
		if (mountedRef.current) {
			setSessionData(next);
		}
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

	const teardownSession = useCallback(() => {
		void runExclusive(() => {
			releaseCurrentSession();
		});
	}, [releaseCurrentSession, runExclusive]);

	useEffect(
		() => () => {
			mountedRef.current = false;
			teardownSession();
		},
		[teardownSession],
	);

	useEffect(() => {
		let disposed = false;
		const create = () =>
			runExclusive(async () => {
				releaseCurrentSession();
				const created = await createSession({
					devMode,
					playerName: playerNameRef.current,
				});
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
			});
		void create();
		return () => {
			disposed = true;
		};
	}, [devMode, releaseCurrentSession, runExclusive, updateSessionData]);

	const refreshSession = useCallback(
		() =>
			runExclusive(async () => {
				const current = sessionStateRef.current;
				const sessionId = current?.sessionId;
				if (!sessionId) {
					return;
				}
				const result = await fetchSnapshot(sessionId);
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
			}),
		[runExclusive, updateSessionData],
	);

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
		return null;
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
