import { useCallback, useMemo } from 'react';
import { getSessionRecord } from './sessionStateStore';
import type {
	SessionAdapter,
	SessionQueueHelpers,
	SessionSnapshot,
} from './sessionTypes';

interface UseSessionQueueResult {
	sessionAdapter: SessionAdapter;
	enqueue: <T>(task: () => Promise<T> | T) => Promise<T>;
	cachedSessionSnapshot: SessionSnapshot;
}

export function useSessionQueue(
	queue: SessionQueueHelpers,
	sessionState: SessionSnapshot,
): UseSessionQueueResult {
	const sessionAdapter = useMemo(
		() => queue.getSessionAdapter(),
		[queue, sessionState],
	);
	const enqueue = useCallback(
		<T>(task: () => Promise<T> | T) => queue.enqueue(task),
		[queue],
	);
	const cachedSessionSnapshot = useMemo(() => {
		const latest = queue.getLatestSnapshot();
		if (latest) {
			return latest;
		}
		const record = getSessionRecord(queue.getSessionId());
		if (record) {
			return record.snapshot;
		}
		return sessionState;
	}, [queue, sessionState]);
	return { sessionAdapter, enqueue, cachedSessionSnapshot };
}
