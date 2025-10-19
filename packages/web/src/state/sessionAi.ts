import type {
	SessionPlayerId,
	SimulateUpcomingPhasesResult,
} from '@kingdom-builder/protocol/session';
import {
	enqueueSessionTask as enqueueSessionTaskInternal,
	getSessionRecord,
} from './sessionStateStore';
import { runAiTurn as runAiTurnRequest } from './sessionSdk';
import { getRemoteAdapter } from './remoteSessionAdapter';

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

export function enqueueSessionTask<T>(
	sessionId: string,
	task: () => Promise<T> | T,
): Promise<T> {
	return enqueueSessionTaskInternal(sessionId, task);
}

export function simulateUpcomingPhases(
	sessionId: string,
	playerId: SessionPlayerId,
): SimulateUpcomingPhasesResult {
	const adapter = getRemoteAdapter(sessionId);
	if (!adapter) {
		throw new Error(`Missing remote session adapter for ${sessionId}`);
	}
	return adapter.simulateUpcomingPhases(playerId);
}
