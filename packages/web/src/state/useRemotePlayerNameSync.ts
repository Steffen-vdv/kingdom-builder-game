import { useEffect, useMemo, useRef } from 'react';
import type { SessionSnapshot } from '@kingdom-builder/protocol/session';
import { hasAiController } from './sessionAi';
import { updatePlayerName as updateRemotePlayerName } from './sessionSdk';
import { DEFAULT_PLAYER_NAME } from './playerIdentity';

interface RemotePlayerNameSyncOptions {
	sessionSnapshot: SessionSnapshot;
	sessionId: string;
	playerName: string;
	enqueue: <T>(task: () => Promise<T> | T) => Promise<T>;
	refresh: () => void;
}

function useRemotePlayerNameSync({
	sessionSnapshot,
	sessionId,
	playerName,
	enqueue,
	refresh,
}: RemotePlayerNameSyncOptions) {
	const playerNameRef = useRef(playerName);
	playerNameRef.current = playerName;
	const controlledPlayerSnapshot = useMemo(() => {
		const players = sessionSnapshot.game.players;
		if (!Array.isArray(players) || players.length === 0) {
			return undefined;
		}
		const { activePlayerId, opponentId } = sessionSnapshot.game;
		return (
			players.find((player) => {
				return !hasAiController(sessionId, player.id);
			}) ??
			players.find((player) => player.id === activePlayerId) ??
			players.find((player) => player.id === opponentId) ??
			players[0]
		);
	}, [
		sessionId,
		sessionSnapshot.game.players,
		sessionSnapshot.game.activePlayerId,
		sessionSnapshot.game.opponentId,
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
		void enqueue(async () => {
			try {
				await updateRemotePlayerName({
					sessionId,
					playerId: controlledPlayerId,
					playerName: desiredName,
				});
			} catch (error) {
				refresh();
				throw error;
			}
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

export { useRemotePlayerNameSync };
