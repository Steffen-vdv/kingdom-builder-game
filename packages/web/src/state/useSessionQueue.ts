import { useCallback, useMemo } from 'react';
import type {
	SessionQueueHelpers,
	SessionSnapshot,
	LegacySession,
} from './sessionTypes';
import { getLegacySessionRecord } from './legacySessionMirror';

interface UseSessionQueueResult {
	legacySession: LegacySession;
	enqueue: <T>(task: () => Promise<T> | T) => Promise<T>;
	cachedSessionSnapshot: SessionSnapshot;
	updatePlayerName: (playerId: string, playerName: string) => Promise<void>;
}

export function useSessionQueue(
	queue: SessionQueueHelpers,
	sessionState: SessionSnapshot,
	sessionId: string,
): UseSessionQueueResult {
	const legacySession = useMemo(
		() => getLegacySessionRecord(sessionId).legacySession,
		[sessionId],
	);
	const enqueue = useCallback(
		<T>(task: () => Promise<T> | T) => queue.enqueue(task),
		[queue],
	);
	const updatePlayerName = useCallback(
		(playerId: string, playerName: string) =>
			queue.updatePlayerName(playerId, playerName),
		[queue],
	);
	const cachedSessionSnapshot = useMemo(() => {
		const latest = queue.getLatestSnapshot();
		if (latest) {
			return latest;
		}
		return sessionState;
	}, [queue, sessionState]);
	return {
		legacySession,
		enqueue,
		cachedSessionSnapshot,
		updatePlayerName,
	};
}
