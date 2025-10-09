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
	getLatestSnapshot: () => SessionSnapshot;
	setLatestSnapshot: (snapshot: SessionSnapshot) => void;
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
	const getLatestSnapshot = useCallback(() => {
		const latest = queue.getLatestSnapshot();
		if (latest) {
			return latest;
		}
		return sessionState;
	}, [queue, sessionState]);
	const setLatestSnapshot = useCallback(
		(snapshot: SessionSnapshot) => {
			queue.setLatestSnapshot(snapshot);
		},
		[queue],
	);
	const cachedSessionSnapshot = useMemo(
		() => getLatestSnapshot(),
		[getLatestSnapshot],
	);
	return {
		session,
		enqueue,
		cachedSessionSnapshot,
		getLatestSnapshot,
		setLatestSnapshot,
	};
}
