import { useCallback, useEffect, useRef, type MutableRefObject } from 'react';
import {
	createSession,
	fetchSnapshot,
	releaseSession,
	type CreateSessionResult,
} from './sessionSdk';
import {
	formatFailureDetails,
	type SessionFailureDetails,
} from './sessionFailures';

interface SessionCreationParams {
	devMode: boolean;
	playerNameRef: MutableRefObject<string>;
	runExclusive: <T>(task: () => Promise<T> | T) => Promise<T>;
	releaseCurrentSession: () => void;
	updateSessionData: (next: CreateSessionResult | null) => void;
	setSessionError: (value: SessionFailureDetails | null) => void;
	bootAttempt: number;
	mountedRef: MutableRefObject<boolean>;
}

export const useSessionCreation = ({
	devMode,
	playerNameRef,
	runExclusive,
	releaseCurrentSession,
	updateSessionData,
	setSessionError,
	bootAttempt,
	mountedRef,
}: SessionCreationParams) => {
	useEffect(() => {
		let disposed = false;
		const controller = new AbortController();
		setSessionError(null);
		const create = () =>
			runExclusive(async () => {
				releaseCurrentSession();
				try {
					const created = await createSession({
						devMode,
						playerName: playerNameRef.current,
						signal: controller.signal,
					});
					if (disposed || !mountedRef.current) {
						releaseSession(created.sessionId);
						return;
					}
					updateSessionData(created);
				} catch (error) {
					if (controller.signal.aborted || disposed || !mountedRef.current) {
						return;
					}
					setSessionError(formatFailureDetails(error));
				}
			});
		void create();
		return () => {
			disposed = true;
			controller.abort();
		};
	}, [
		devMode,
		playerNameRef,
		runExclusive,
		releaseCurrentSession,
		updateSessionData,
		setSessionError,
		bootAttempt,
		mountedRef,
	]);
};

interface SessionRefreshParams {
	runExclusive: <T>(task: () => Promise<T> | T) => Promise<T>;
	sessionStateRef: MutableRefObject<{ sessionId: string } | null>;
	mountedRef: MutableRefObject<boolean>;
	updateSessionData: (next: CreateSessionResult | null) => void;
	releaseCurrentSession: () => void;
	setSessionError: (value: SessionFailureDetails | null) => void;
}

export const useSessionRefresh = ({
	runExclusive,
	sessionStateRef,
	mountedRef,
	updateSessionData,
	releaseCurrentSession,
	setSessionError,
}: SessionRefreshParams) => {
	const refreshAbortRef = useRef<AbortController | null>(null);

	const abortRefresh = useCallback(() => {
		const controller = refreshAbortRef.current;
		if (!controller) {
			return;
		}
		refreshAbortRef.current = null;
		controller.abort();
	}, []);

	const refreshSession = useCallback(() => {
		abortRefresh();
		return runExclusive(async () => {
			const current = sessionStateRef.current;
			const sessionId = current?.sessionId;
			if (!sessionId) {
				return;
			}
			const controller = new AbortController();
			refreshAbortRef.current = controller;
			try {
				const requestInit = {
					signal: controller.signal,
				};
				const result = await fetchSnapshot(sessionId, requestInit);
				const currentState = sessionStateRef.current;
				const isSameSession = currentState?.sessionId === sessionId;
				if (!mountedRef.current || !isSameSession) {
					return;
				}
				updateSessionData({
					...result,
					sessionId,
				} as CreateSessionResult);
			} catch (error) {
				if (controller.signal.aborted || !mountedRef.current) {
					return;
				}
				releaseCurrentSession();
				setSessionError(formatFailureDetails(error));
			} finally {
				const currentController = refreshAbortRef.current;
				const isCurrent = currentController === controller;
				if (isCurrent) {
					refreshAbortRef.current = null;
				}
			}
		});
	}, [
		abortRefresh,
		runExclusive,
		sessionStateRef,
		mountedRef,
		updateSessionData,
		releaseCurrentSession,
		setSessionError,
	]);

	const teardownSession = useCallback(() => {
		abortRefresh();
		void runExclusive(() => {
			releaseCurrentSession();
		});
	}, [abortRefresh, releaseCurrentSession, runExclusive]);

	return { refreshSession, teardownSession };
};
