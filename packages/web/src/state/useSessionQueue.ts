import { useCallback } from 'react';
import type { SessionQueueHelpers, SessionSnapshot } from './sessionTypes';

interface UseSessionQueueResult {
	enqueue: <T>(task: () => Promise<T> | T) => Promise<T>;
	cachedSessionSnapshot: SessionSnapshot;
	updatePlayerName: (playerId: string, playerName: string) => Promise<void>;
}

export function useSessionQueue(
	queue: SessionQueueHelpers,
	sessionState: SessionSnapshot,
): UseSessionQueueResult {
	const enqueue = useCallback(
		<T>(task: () => Promise<T> | T) => queue.enqueue(task),
		[queue],
	);
	const updatePlayerName = useCallback(
		(playerId: string, playerName: string) =>
			queue.updatePlayerName(playerId, playerName),
		[queue],
	);
	const latestSnapshot = queue.getLatestSnapshot();
	const cachedSessionSnapshot = latestSnapshot ?? sessionState;
	return {
		enqueue,
		cachedSessionSnapshot,
		updatePlayerName,
	};
}
