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
    if (changes.length === 0) {
      return undefined;
    }

    if (typeof window === 'undefined') {
      return undefined;
    }

    const timers = changes.map((change) =>
      window.setTimeout(() => {
        setChanges((existing) =>
          existing.filter((item) => item.id !== change.id),
        );
      }, INDICATOR_DURATION),
    );

    return () => {
      timers.forEach((timer) => window.clearTimeout(timer));
    };
  }, [changes]);

  return changes;
};

export type UseValueChangeIndicatorsReturn = ReturnType<
  typeof useValueChangeIndicators
>;
