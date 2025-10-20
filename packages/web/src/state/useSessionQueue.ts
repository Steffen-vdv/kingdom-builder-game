import { useCallback, useMemo } from 'react';
import { getSessionRecord } from './sessionStateStore';
import type {
	SessionQueueHelpers,
	SessionSnapshot,
	Session,
} from './sessionTypes';

interface UseSessionQueueResult {
	adapter: Session;
	enqueue: <T>(task: () => Promise<T> | T) => Promise<T>;
	cachedSessionSnapshot: SessionSnapshot;
}

export function useSessionQueue(
	queue: SessionQueueHelpers,
	sessionSnapshot: SessionSnapshot,
	sessionId: string,
): UseSessionQueueResult {
	const adapter = useMemo(
		() => queue.getCurrentSession(),
		[queue, sessionSnapshot],
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
		const record = getSessionRecord(sessionId);
		if (record) {
			return record.snapshot;
		}
		return sessionSnapshot;
	}, [queue, sessionId, sessionSnapshot]);
	return {
		adapter,
		enqueue,
		cachedSessionSnapshot,
	};
}
