import { useEffect, useRef, useState } from 'react';

export interface ValueChangeIndicator {
	id: number;
	delta: number;
	direction: 'gain' | 'loss';
}

const INDICATOR_DURATION = 1200;

export const useValueChangeIndicators = (value: number) => {
	const previousRef = useRef<number | undefined>();
	const idRef = useRef(0);
	const [changes, setChanges] = useState<ValueChangeIndicator[]>([]);
	const timersRef = useRef<Map<number, number>>(new Map());

	useEffect(() => {
		const previous = previousRef.current;
		if (previous !== undefined && previous !== value) {
			const delta = value - previous;
			if (delta !== 0) {
				const id = idRef.current;
				idRef.current += 1;
				setChanges((existing) => [
					...existing,
					{ id, delta, direction: delta > 0 ? 'gain' : 'loss' },
				]);
			}
		}
		previousRef.current = value;
	}, [value]);

	useEffect(() => {
		if (typeof window === 'undefined') {
			return;
		}

		const scheduledTimers = timersRef.current;
		const activeIds = new Set(changes.map((change) => change.id));

		for (const [id, timeoutId] of Array.from(scheduledTimers.entries())) {
			if (!activeIds.has(id)) {
				window.clearTimeout(timeoutId);
				scheduledTimers.delete(id);
			}
		}

		changes.forEach((change) => {
			if (scheduledTimers.has(change.id)) {
				return;
			}

			const timeoutId = window.setTimeout(() => {
				scheduledTimers.delete(change.id);
				setChanges((existing) =>
					existing.filter((item) => item.id !== change.id),
				);
			}, INDICATOR_DURATION);

			scheduledTimers.set(change.id, timeoutId);
		});
	}, [changes]);

	useEffect(() => {
		if (typeof window === 'undefined') {
			return undefined;
		}

		return () => {
			const scheduledTimers = timersRef.current;
			scheduledTimers.forEach((timeoutId) => {
				window.clearTimeout(timeoutId);
			});
			scheduledTimers.clear();
		};
	}, []);

	return changes;
};

export type UseValueChangeIndicatorsReturn = ReturnType<
	typeof useValueChangeIndicators
>;
