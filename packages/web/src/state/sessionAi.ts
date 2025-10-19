import type { SessionPlayerId } from '@kingdom-builder/protocol/session';
import {
	enqueueSessionTask as enqueueSessionTaskInternal,
	getSessionRecord,
} from './sessionStateStore';
import { runAiTurn as runAiTurnThroughSdk } from './sessionSdk';

export function hasAiController(
	sessionId: string,
	playerId: SessionPlayerId,
): boolean {
	const record = getSessionRecord(sessionId);
	if (!record) {
		return false;
	}
	const player = record.snapshot.game.players.find(
		(entry) => entry.id === playerId,
	);
	return Boolean(player?.aiControlled);
}

export async function runAiTurn(
	sessionId: string,
	playerId: SessionPlayerId,
): Promise<boolean> {
	const response = await runAiTurnThroughSdk({ sessionId, playerId });
	return response.ranTurn;
}

export function enqueueSessionTask<T>(
	sessionId: string,
	task: () => Promise<T> | T,
): Promise<T> {
	return enqueueSessionTaskInternal(sessionId, task);
}
