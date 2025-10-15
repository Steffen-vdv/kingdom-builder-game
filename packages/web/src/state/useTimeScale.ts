import {
	useCallback,
	useEffect,
	useRef,
	useState,
	type MutableRefObject,
} from 'react';

export const TIME_SCALE_OPTIONS = [1, 2, 5, 100] as const;
export type TimeScale = (typeof TIME_SCALE_OPTIONS)[number];
const TIME_SCALE_STORAGE_KEY = 'kingdom-builder:time-scale';

function readStoredTimeScale(): TimeScale | null {
	if (typeof window === 'undefined') {
		return null;
	}
	try {
		const raw = window.localStorage.getItem(TIME_SCALE_STORAGE_KEY);
		if (!raw) {
			return null;
		}
		const parsed = Number(raw);
		return (TIME_SCALE_OPTIONS as readonly number[]).includes(parsed)
			? (parsed as TimeScale)
			: null;
	} catch (error: unknown) {
		void error;
		return null;
	}
}

interface UseTimeScaleOptions {
	devMode: boolean;
}

export interface TimeScaleControls {
	timeScale: TimeScale;
	setTimeScale: (value: TimeScale) => void;
	clearTrackedTimeout: (id: number) => void;
	setTrackedTimeout: (handler: () => void, delay: number) => number;
	clearTrackedInterval: (id: number) => void;
	setTrackedInterval: (handler: () => void, delay: number) => number;
	isMountedRef: MutableRefObject<boolean>;
	timeScaleRef: MutableRefObject<TimeScale>;
}

export function useTimeScale({
	devMode,
}: UseTimeScaleOptions): TimeScaleControls {
	const timeScaleRef = useRef<TimeScale>(1);
	const [timeScale, setTimeScaleState] = useState<TimeScale>(() => {
		if (devMode) {
			timeScaleRef.current = 100;
			return 100;
		}
		const stored = readStoredTimeScale();
		const next = stored ?? 1;
		timeScaleRef.current = next;
		return next;
	});

	useEffect(() => {
		if (devMode) {
			timeScaleRef.current = 100;
			setTimeScaleState(100);
			return;
		}
		const stored = readStoredTimeScale();
		const next = stored ?? 1;
		timeScaleRef.current = next;
		setTimeScaleState(next);
	}, [devMode]);

	const updateTimeScale = useCallback(
		(value: TimeScale) => {
			setTimeScaleState((prev) => {
				if (prev === value) {
					return prev;
				}
				if (typeof window !== 'undefined') {
					try {
						const storage = window.localStorage;
						storage.setItem(TIME_SCALE_STORAGE_KEY, String(value));
					} catch (error: unknown) {
						// Ignore storage exceptions (e.g., Safari private mode).
						void error;
					}
				}
				timeScaleRef.current = value;
				return value;
			});
		},
		[timeScaleRef],
	);

	const timeouts = useRef(new Set<number>());
	const intervals = useRef(new Set<number>());
	const isMountedRef = useRef(true);

	useEffect(() => {
		return () => {
			isMountedRef.current = false;
			timeouts.current.forEach((id) => {
				window.clearTimeout(id);
			});
			intervals.current.forEach((id) => {
				window.clearInterval(id);
			});
			timeouts.current.clear();
			intervals.current.clear();
		};
	}, []);

	const clearTrackedTimeout = useCallback((id: number) => {
		window.clearTimeout(id);
		timeouts.current.delete(id);
	}, []);

	const setTrackedTimeout = useCallback(
		(handler: () => void, delay: number) => {
			const timeoutId = window.setTimeout(() => {
				timeouts.current.delete(timeoutId);
				if (!isMountedRef.current) {
					return;
				}
				handler();
			}, delay);
			timeouts.current.add(timeoutId);
			return timeoutId;
		},
		[],
	);

	const clearTrackedInterval = useCallback((id: number) => {
		window.clearInterval(id);
		intervals.current.delete(id);
	}, []);

	const setTrackedInterval = useCallback(
		(handler: () => void, delay: number) => {
			const intervalId = window.setInterval(() => {
				if (!isMountedRef.current) {
					clearTrackedInterval(intervalId);
					return;
				}
				handler();
			}, delay);
			intervals.current.add(intervalId);
			return intervalId;
		},
		[clearTrackedInterval],
	);

	return {
		timeScale,
		setTimeScale: updateTimeScale,
		clearTrackedTimeout,
		setTrackedTimeout,
		clearTrackedInterval,
		setTrackedInterval,
		isMountedRef,
		timeScaleRef,
	};
}
