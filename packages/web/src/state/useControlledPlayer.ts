import { useEffect, useMemo, useRef } from 'react';
import type { SessionSnapshot } from '@kingdom-builder/protocol/session';
import type { SessionAdapter } from './sessionTypes';
import { DEFAULT_PLAYER_NAME } from './playerIdentity';
import { updatePlayerName as updateRemotePlayerName } from './sessionSdk';

interface UseControlledPlayerOptions {
	sessionAdapter: SessionAdapter;
	sessionSnapshot: SessionSnapshot;
	enqueue: <T>(task: () => Promise<T> | T) => Promise<T>;
	sessionId: string;
	desiredPlayerName: string;
	refresh: () => void;
}

export function useControlledPlayer({
	sessionAdapter,
	sessionSnapshot,
	enqueue,
	sessionId,
	desiredPlayerName,
	refresh,
}: UseControlledPlayerOptions) {
	const playerNameRef = useRef(desiredPlayerName);
	playerNameRef.current = desiredPlayerName;
	const controlledPlayer = useMemo(() => {
		const players = sessionSnapshot.game.players;
		if (!Array.isArray(players) || players.length === 0) {
			return undefined;
		}
		const { activePlayerId, opponentId } = sessionSnapshot.game;
		return (
			players.find((player) => {
				return !sessionAdapter.hasAiController(player.id);
			}) ??
			players.find((player) => player.id === activePlayerId) ??
			players.find((player) => player.id === opponentId) ??
			players[0]
		);
	}, [sessionAdapter, sessionSnapshot.game]);

	useEffect(() => {
		const controlledPlayerId = controlledPlayer?.id;
		const controlledPlayerName = controlledPlayer?.name;
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
		refresh,
		sessionId,
		controlledPlayer?.id,
		controlledPlayer?.name,
	]);

	return controlledPlayer;
}
