import { useEffect } from 'react';
import type { MutableRefObject } from 'react';
import { DEFAULT_PLAYER_NAME } from './playerIdentity';
import { updatePlayerName as updateRemotePlayerName } from './sessionSdk';

interface PlayerNameSyncOptions {
	controlledPlayerId: string | undefined;
	controlledPlayerName: string | undefined;
	playerNameRef: MutableRefObject<string | undefined>;
	enqueue: <T>(task: () => Promise<T> | T) => Promise<T>;
	refresh: () => void;
	playerName: string | undefined;
	sessionId: string;
}

export function usePlayerNameSync({
	controlledPlayerId,
	controlledPlayerName,
	playerNameRef,
	enqueue,
	refresh,
	playerName,
	sessionId,
}: PlayerNameSyncOptions) {
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
}
