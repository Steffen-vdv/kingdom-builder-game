import { useCallback, useMemo } from 'react';
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
): UseSessionQueueResult {
	const session = useMemo(
		() => queue.getCurrentSession(),
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
		return session.getSnapshot();
	}, [queue, session, sessionState]);
	return { session, enqueue, cachedSessionSnapshot };
}
