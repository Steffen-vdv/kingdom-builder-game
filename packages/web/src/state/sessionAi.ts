import type {
	SessionPlayerId,
	SessionSimulateResponse,
	SessionSnapshot,
} from '@kingdom-builder/protocol/session';
import { getRemoteAdapter } from './remoteSessionAdapter';
import {
	assertSessionRecord,
	enqueueSessionTask as enqueueTask,
	getSessionRecord,
} from './sessionStateStore';
import { runAiTurn as runAiTurnRequest } from './sessionSdk';

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
	const response = await runAiTurnRequest({ sessionId, playerId });
	return response.ranTurn;
}

export function getSessionSnapshot(sessionId: string): SessionSnapshot {
	return assertSessionRecord(sessionId).snapshot;
}

export function simulateUpcomingPhases(
	sessionId: string,
	playerId: SessionPlayerId,
): SessionSimulateResponse['result'] {
	const adapter = getRemoteAdapter(sessionId);
	if (!adapter) {
		throw new Error(`Missing session adapter for ${sessionId}`);
	}
	return adapter.simulateUpcomingPhases(playerId);
}

export { enqueueTask as enqueueSessionTask };
