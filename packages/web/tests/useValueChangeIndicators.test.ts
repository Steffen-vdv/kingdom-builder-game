import { describe, expect, it, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { JSDOM } from 'jsdom';
import { useValueChangeIndicators } from '../src/utils/useValueChangeIndicators';

const jsdom = new JSDOM('<!doctype html><html><body></body></html>');
vi.stubGlobal('window', jsdom.window as unknown as typeof globalThis);
vi.stubGlobal('document', jsdom.window.document);
vi.stubGlobal('navigator', jsdom.window.navigator);

const FIRST_CHANGE_VALUE = 5;
const SECOND_CHANGE_VALUE = 10;
const HALF_DURATION = 600;

describe('useValueChangeIndicators', () => {
	it('does not extend existing indicator durations when new changes occur', () => {
		vi.useFakeTimers();

		try {
			const { result, rerender } = renderHook(
				({ value }) => useValueChangeIndicators(value),
				{ initialProps: { value: 0 } },
			);

			expect(result.current).toHaveLength(0);

			act(() => {
				rerender({ value: FIRST_CHANGE_VALUE });
			});

			expect(result.current).toHaveLength(1);

			act(() => {
				vi.advanceTimersByTime(HALF_DURATION);
			});

			expect(result.current).toHaveLength(1);

			act(() => {
				rerender({ value: SECOND_CHANGE_VALUE });
			});

			expect(result.current).toHaveLength(2);
			const [, secondChange] = result.current;

			act(() => {
				vi.advanceTimersByTime(HALF_DURATION);
			});

			expect(result.current).toHaveLength(1);
			expect(result.current[0]?.id).toBe(secondChange.id);

			act(() => {
				vi.advanceTimersByTime(HALF_DURATION);
			});

			expect(result.current).toHaveLength(0);
		} finally {
			vi.useRealTimers();
		}
	});
});
