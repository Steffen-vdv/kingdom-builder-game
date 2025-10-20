import { useCallback } from 'react';
import type { HistoryState } from './appHistory';

export const useHistoryNavigation = () => {
	const pushHistoryState = useCallback(
		(nextState: HistoryState, path: string) => {
			if (typeof window === 'undefined') {
				return;
			}
			window.history.pushState(nextState, '', path);
		},
		[],
	);

	const replaceHistoryState = useCallback(
		(nextState: HistoryState, path?: string) => {
			if (typeof window === 'undefined') {
				return;
			}
			const { history, location } = window;
			history.replaceState(nextState, '', path ?? location.pathname);
		},
		[],
	);

	return { pushHistoryState, replaceHistoryState };
};
