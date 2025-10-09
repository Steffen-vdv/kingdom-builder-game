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
	type Session,
	type SessionRegistries,
	type SessionResourceKeys,
	type SessionRuleSnapshot,
	type SessionSnapshot,
} from './GameProviderInner';
import type { LegacyGameEngineContextValue } from './GameContext.types';
import { DEFAULT_PLAYER_NAME } from './playerIdentity';
import { createSession, fetchSnapshot, releaseSession } from './sessionSdk';

export { TIME_SCALE_OPTIONS } from './useTimeScale';
export type { TimeScale } from './useTimeScale';
export type { PhaseStep } from './phaseTypes';
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
	sessionId: string;
	snapshot: SessionSnapshot;
	ruleSnapshot: SessionRuleSnapshot;
	registries: SessionRegistries;
	resourceKeys: SessionResourceKeys;
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
	const sessionRef = useRef<Session | null>(null);
	const sessionIdRef = useRef<string | null>(null);
	const [sessionData, setSessionData] = useState<SessionContainer | null>(null);
	const playerNameRef = useRef(playerName);
	playerNameRef.current = playerName;

	const teardownSession = useCallback(() => {
		const currentId = sessionIdRef.current;
		if (currentId) {
			releaseSession(currentId);
		}
		sessionIdRef.current = null;
		sessionRef.current = null;
		if (mountedRef.current) {
			setSessionData(null);
		}
	}, [mountedRef]);

	useEffect(
		() => () => {
			mountedRef.current = false;
			teardownSession();
		},
		[teardownSession],
	);

	useEffect(() => {
		let disposed = false;
		const create = async () => {
			const previousId = sessionIdRef.current;
			if (previousId) {
				releaseSession(previousId);
			}
			sessionIdRef.current = null;
			sessionRef.current = null;
			setSessionData(null);
			const created = await createSession({
				devMode,
				playerName: playerNameRef.current,
			});
			if (disposed || !mountedRef.current) {
				releaseSession(created.sessionId);
				return;
			}
			sessionRef.current = created.session;
			sessionIdRef.current = created.sessionId;
			setSessionData({
				session: created.session,
				sessionId: created.sessionId,
				snapshot: created.snapshot,
				ruleSnapshot: created.ruleSnapshot,
				registries: created.registries,
				resourceKeys: created.resourceKeys,
			});
		};
		void create();
		return () => {
			disposed = true;
		};
	}, [devMode]);

	const refreshSession = useCallback(async () => {
		const sessionId = sessionIdRef.current;
		if (!sessionId) {
			return;
		}
		const result = await fetchSnapshot(sessionId);
		if (!mountedRef.current || sessionIdRef.current !== sessionId) {
			return;
		}
		sessionRef.current = result.session;
		setSessionData({
			session: result.session,
			sessionId,
			snapshot: result.snapshot,
			ruleSnapshot: result.ruleSnapshot,
			registries: result.registries,
			resourceKeys: result.resourceKeys,
		});
	}, []);

	const handleRelease = useCallback(() => {
		teardownSession();
	}, [teardownSession]);

	if (!sessionData || !sessionRef.current) {
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
		session: sessionRef.current,
		sessionId: sessionData.sessionId,
		sessionState: sessionData.snapshot,
		ruleSnapshot: sessionData.ruleSnapshot,
		refreshSession,
		onReleaseSession: handleRelease,
		registries: sessionData.registries,
		resourceKeys: sessionData.resourceKeys,
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
