/** @vitest-environment jsdom */
import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import React from 'react';
import { useActionResolution } from '../../src/state/useActionResolution';
import { ACTION_EFFECT_DELAY } from '../../src/state/useGameLog';

describe('useActionResolution', () => {
	it('reveals lines, logs entries, and resolves after acknowledgement', async () => {
		vi.useFakeTimers();
		try {
			const addLog = vi.fn();
			const setTrackedTimeout = vi
				.fn<(callback: () => void, delay: number) => number>()
				.mockImplementation((callback, delay) => {
					return window.setTimeout(callback, delay);
				});
			const { result, rerender } = renderHook(
				({ scale }: { scale: number }) => {
					const timeScaleRef = React.useRef(scale);
					timeScaleRef.current = scale;
					const mountedRef = React.useRef(true);
					React.useEffect(() => {
						return () => {
							mountedRef.current = false;
						};
					}, []);
					return useActionResolution({
						addLog,
						setTrackedTimeout,
						timeScaleRef,
						mountedRef,
					});
				},
				{ initialProps: { scale: 3 } },
			);
			let resolutionPromise: Promise<void> = Promise.resolve();
			act(() => {
				resolutionPromise = result.current.showResolution({
					lines: ['First reveal', 'Second reveal'],
					player: {
						id: 'A',
						name: 'Player A',
					},
				});
			});
			expect(addLog).toHaveBeenCalledTimes(1);
			expect(addLog).toHaveBeenLastCalledWith('First reveal', {
				id: 'A',
				name: 'Player A',
			});
			expect(result.current.resolution?.visibleLines).toEqual(['First reveal']);
			expect(result.current.resolution?.isComplete).toBe(false);
			expect(setTrackedTimeout).toHaveBeenLastCalledWith(
				expect.any(Function),
				ACTION_EFFECT_DELAY / 3,
			);
			act(() => {
				vi.advanceTimersByTime(ACTION_EFFECT_DELAY / 3 - 1);
			});
			expect(result.current.resolution?.visibleLines).toEqual(['First reveal']);
			expect(addLog).toHaveBeenCalledTimes(1);
			act(() => {
				vi.advanceTimersByTime(1);
			});
			expect(result.current.resolution?.visibleLines).toEqual([
				'First reveal',
				'Second reveal',
			]);
			expect(result.current.resolution?.isComplete).toBe(true);
			expect(addLog).toHaveBeenCalledTimes(2);
			expect(addLog).toHaveBeenLastCalledWith('Second reveal', {
				id: 'A',
				name: 'Player A',
			});
			const resolvedState = { done: false };
			void resolutionPromise.then(() => {
				resolvedState.done = true;
			});
			await Promise.resolve();
			expect(resolvedState.done).toBe(false);
			act(() => {
				result.current.acknowledgeResolution();
			});
			await resolutionPromise;
			expect(resolvedState.done).toBe(true);
			expect(result.current.resolution).toBeNull();
			rerender({ scale: 1 });
		} finally {
			vi.useRealTimers();
		}
	});
});
