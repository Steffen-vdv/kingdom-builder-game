import { useCallback, useEffect, useMemo, useState } from 'react';
import { ensureGameApi } from './gameApiInstance';
import { isAbortError } from './isAbortError';

interface VisitorCountState {
	totalVisitors: number | null;
	hoursIncluded: number | null;
	isLoading: boolean;
	error: Error | null;
}

export interface UseVisitorCountResult extends VisitorCountState {
	retry: () => void;
}

const DEFAULT_STATE: VisitorCountState = {
	totalVisitors: null,
	hoursIncluded: null,
	isLoading: false,
	error: null,
};

// Cache visitor stats for 5 minutes to avoid excessive API calls
let cachedStats: { totalVisitors: number; hoursIncluded: number } | null = null;
let cacheTimestamp = 0;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

const isCacheValid = (): boolean => {
	if (!cachedStats) {
		return false;
	}
	return Date.now() - cacheTimestamp < CACHE_TTL_MS;
};

/**
 * Hook to fetch visitor count for the last 24 hours.
 * Results are cached for 5 minutes to reduce API load.
 *
 * @param enabled - Whether to fetch data (default: true)
 */
export function useVisitorCount(enabled = true): UseVisitorCountResult {
	const [state, setState] = useState<VisitorCountState>(() => {
		if (isCacheValid() && cachedStats) {
			return {
				totalVisitors: cachedStats.totalVisitors,
				hoursIncluded: cachedStats.hoursIncluded,
				isLoading: false,
				error: null,
			};
		}
		return DEFAULT_STATE;
	});
	const [reloadToken, setReloadToken] = useState(0);

	const retry = useCallback(() => {
		// Invalidate cache on retry
		cachedStats = null;
		cacheTimestamp = 0;
		setReloadToken((token) => token + 1);
	}, []);

	useEffect(() => {
		if (!enabled) {
			return;
		}

		// Return cached data if valid
		if (isCacheValid() && cachedStats) {
			setState({
				totalVisitors: cachedStats.totalVisitors,
				hoursIncluded: cachedStats.hoursIncluded,
				isLoading: false,
				error: null,
			});
			return;
		}

		let disposed = false;
		const controller = new AbortController();

		setState((previous) => ({
			totalVisitors: previous.totalVisitors,
			hoursIncluded: previous.hoursIncluded,
			isLoading: true,
			error: null,
		}));

		const api = ensureGameApi();
		void api
			.fetchVisitorStats({ signal: controller.signal })
			.then((response) => {
				if (disposed) {
					return;
				}
				// Update cache
				cachedStats = {
					totalVisitors: response.totalVisitors,
					hoursIncluded: response.hoursIncluded,
				};
				cacheTimestamp = Date.now();

				setState({
					totalVisitors: response.totalVisitors,
					hoursIncluded: response.hoursIncluded,
					isLoading: false,
					error: null,
				});
			})
			.catch((error) => {
				if (disposed || isAbortError(error)) {
					return;
				}
				const normalized =
					error instanceof Error ? error : new Error(String(error));
				setState({
					totalVisitors: null,
					hoursIncluded: null,
					isLoading: false,
					error: normalized,
				});
			});

		return () => {
			disposed = true;
			controller.abort();
		};
	}, [enabled, reloadToken]);

	return useMemo(
		() => ({
			...state,
			retry,
		}),
		[state, retry],
	);
}

/**
 * Clears the visitor count cache, forcing a fresh fetch on next hook call.
 */
export function clearVisitorCountCache(): void {
	cachedStats = null;
	cacheTimestamp = 0;
}
