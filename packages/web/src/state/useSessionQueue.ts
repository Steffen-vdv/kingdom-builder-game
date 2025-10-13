import { useCallback, useMemo } from 'react';
import { enqueueSessionTask, getSessionRecord } from './sessionStateStore';
import type {
	SessionQueueHelpers,
	SessionSnapshot,
	Session,
} from './sessionTypes';

interface UseSessionQueueResult {
	session: Session;
	enqueue: <T>(task: () => Promise<T> | T) => Promise<T>;
	cachedSessionSnapshot: SessionSnapshot;
}

export function useSessionQueue(
	queue: SessionQueueHelpers,
	sessionState: SessionSnapshot,
	sessionId: string,
): UseSessionQueueResult {
	const adapter = useMemo(
		() => queue.getCurrentSession(),
		[queue, sessionState],
	);
	const session = adapter;
	const enqueue = useCallback(
		<T>(task: () => Promise<T> | T) => enqueueSessionTask(sessionId, task),
		[sessionId],
	);
	const cachedSessionSnapshot = useMemo(() => {
		const latest = queue.getLatestSnapshot();
		if (latest) {
			return latest;
		}
		const record = getSessionRecord(sessionId);
		if (record) {
			return record.snapshot;
		}
		return sessionState;
	}, [queue, sessionId, sessionState]);
	return {
		session,
		enqueue,
		cachedSessionSnapshot,
	};
}
