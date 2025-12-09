import { useEffect, useRef } from 'react';
import { fetchSnapshot } from './sessionSdk';
import { isSessionExpiredError } from './sessionErrors';

/**
 * The interval between heartbeat pings. Set to 5 minutes which is well under
 * the server's 15-minute session timeout.
 */
const HEARTBEAT_INTERVAL_MS = 5 * 60 * 1000;

interface UseSessionHeartbeatOptions {
	sessionId: string;
	mountedRef: React.MutableRefObject<boolean>;
	onSessionExpired: (error: unknown) => void;
}

/**
 * Periodically pings the server to keep the session alive. If the session has
 * already expired, triggers the onSessionExpired callback so the UI can show
 * a recovery screen.
 */
export function useSessionHeartbeat({
	sessionId,
	mountedRef,
	onSessionExpired,
}: UseSessionHeartbeatOptions): void {
	const onSessionExpiredRef = useRef(onSessionExpired);
	onSessionExpiredRef.current = onSessionExpired;

	useEffect(() => {
		let intervalId: ReturnType<typeof setInterval> | null = null;

		const sendHeartbeat = async () => {
			if (!mountedRef.current) {
				return;
			}
			try {
				// fetchSnapshot updates lastAccessedAt on the server, keeping
				// the session alive. We discard the result since we only care
				// about the keepalive side effect.
				await fetchSnapshot(sessionId);
			} catch (error) {
				if (!mountedRef.current) {
					return;
				}
				if (isSessionExpiredError(error)) {
					onSessionExpiredRef.current(error);
					// Stop heartbeat once session is expired
					if (intervalId !== null) {
						clearInterval(intervalId);
						intervalId = null;
					}
				}
				// Ignore other errors (network issues, etc.) - the heartbeat
				// will retry on the next interval
			}
		};

		intervalId = setInterval(() => {
			void sendHeartbeat();
		}, HEARTBEAT_INTERVAL_MS);

		return () => {
			if (intervalId !== null) {
				clearInterval(intervalId);
			}
		};
	}, [sessionId, mountedRef]);
}
