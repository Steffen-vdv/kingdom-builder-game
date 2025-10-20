import { useMemo } from 'react';
import { hasAiController } from './sessionAi';
import type { SessionSnapshot } from './sessionTypes';

interface ControlledPlayerOptions {
	sessionSnapshot: SessionSnapshot;
	sessionId: string;
}

export function useControlledPlayerSnapshot({
	sessionSnapshot,
	sessionId,
}: ControlledPlayerOptions) {
	return useMemo(() => {
		const players = sessionSnapshot.game.players;
		if (!Array.isArray(players) || players.length === 0) {
			return undefined;
		}
		const { activePlayerId, opponentId } = sessionSnapshot.game;
		return (
			players.find((player) => !hasAiController(sessionId, player.id)) ??
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
}
