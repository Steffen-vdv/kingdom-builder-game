import type { SessionPlayerId } from '@kingdom-builder/protocol/session';
import {
	enqueueSessionTask as enqueueSessionTaskInternal,
	getSessionRecord,
} from './sessionStateStore';
import { runAiTurn as runAiTurnThroughSdk } from './sessionSdk';
import type { SessionAiTurnResult } from './sessionTypes';

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
): Promise<SessionAiTurnResult> {
	return await runAiTurnThroughSdk({ sessionId, playerId });
}

export function enqueueSessionTask<T>(
	sessionId: string,
	task: () => Promise<T> | T,
): Promise<T> {
	return enqueueSessionTaskInternal(sessionId, task);
}
