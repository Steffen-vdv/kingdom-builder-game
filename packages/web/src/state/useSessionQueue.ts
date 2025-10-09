import { useCallback, useMemo } from 'react';
import type {
	SessionQueueHelpers,
	SessionSnapshot,
	Session,
	LegacySession,
} from './sessionTypes';

interface UseSessionQueueResult {
	session: Session;
	legacySession: LegacySession;
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
	const legacySession = useMemo(
		() => queue.getLegacySession(),
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
		return sessionState;
	}, [queue, sessionState]);
	return { session, legacySession, enqueue, cachedSessionSnapshot };
}
