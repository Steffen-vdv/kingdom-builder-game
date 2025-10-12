/** @vitest-environment jsdom */
import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useToasts } from '../../src/state/useToasts';

afterEach(() => {
	vi.useRealTimers();
});

describe('useToasts', () => {
	it('normalizes blank messages, trims titles, and schedules dismissal', () => {
		vi.useFakeTimers();
		const setTrackedTimeout = vi.fn((callback: () => void, delay: number) =>
			window.setTimeout(callback, delay),
		);
		const { result } = renderHook(() => useToasts({ setTrackedTimeout }));

		act(() => {
			result.current.pushToast({
				message: '   ',
				variant: 'success',
			});
		});

		expect(result.current.toasts).toEqual([
			{
				id: 0,
				message: 'Done',
				title: 'Success',
				variant: 'success',
			},
		]);

		act(() => {
			result.current.pushToast({
				message: '  Hello world  ',
				title: '  Custom Title  ',
				variant: 'error',
			});
		});

		expect(result.current.toasts[1]).toMatchObject({
			message: 'Hello world',
			title: 'Custom Title',
			variant: 'error',
		});
		expect(setTrackedTimeout).toHaveBeenCalledTimes(2);
		expect(setTrackedTimeout).toHaveBeenNthCalledWith(
			1,
			expect.any(Function),
			5000,
		);
		expect(setTrackedTimeout).toHaveBeenNthCalledWith(
			2,
			expect.any(Function),
			5000,
		);
	});

	it('removes toasts after the dismiss timeout fires', () => {
		vi.useFakeTimers();
		const setTrackedTimeout = vi.fn((callback: () => void, delay: number) =>
			window.setTimeout(callback, delay),
		);
		const { result } = renderHook(() => useToasts({ setTrackedTimeout }));

		act(() => {
			result.current.pushToast({
				message: 'Toast message',
				variant: 'success',
			});
		});

		expect(result.current.toasts).toHaveLength(1);

		act(() => {
			vi.advanceTimersByTime(5000);
		});

		expect(result.current.toasts).toHaveLength(0);
	});
});
