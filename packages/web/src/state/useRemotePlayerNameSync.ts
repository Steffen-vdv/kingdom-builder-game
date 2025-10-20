import { useEffect } from 'react';
import type { RefObject } from 'react';
import type { SessionPlayerId } from '@kingdom-builder/protocol/session';
import { DEFAULT_PLAYER_NAME } from './playerIdentity';
import { updatePlayerName as updateRemotePlayerName } from './sessionSdk';

interface RemotePlayerNameSyncOptions {
	controlledPlayerId: SessionPlayerId | undefined;
	controlledPlayerName: string | undefined;
	sessionId: string;
	enqueue: <T>(task: () => Promise<T> | T) => Promise<T>;
	refresh: () => void;
	playerNameRef: RefObject<string | undefined>;
	playerName: string;
}

export function useRemotePlayerNameSync({
	controlledPlayerId,
	controlledPlayerName,
	sessionId,
	enqueue,
	refresh,
	playerNameRef,
	playerName,
}: RemotePlayerNameSyncOptions) {
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
		playerNameRef,
	]);
}
