/** @vitest-environment jsdom */
import { renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useSessionHeartbeat } from '../../src/state/useSessionHeartbeat';
import { GameApiError } from '../../src/services/gameApi';

const mockFetchSnapshot = vi.fn();

vi.mock('../../src/state/gameApiInstance', () => ({
	ensureGameApi: vi.fn(() => ({
		fetchSnapshot: mockFetchSnapshot,
	})),
}));

describe('useSessionHeartbeat', () => {
	beforeEach(() => {
		vi.useFakeTimers();
		mockFetchSnapshot.mockReset();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('sends heartbeat at 5 minute intervals', async () => {
		const mountedRef = { current: true };
		const onSessionExpired = vi.fn();
		mockFetchSnapshot.mockResolvedValue({});

		renderHook(() =>
			useSessionHeartbeat({
				sessionId: 'test-session',
				mountedRef,
				onSessionExpired,
			}),
		);

		// No immediate heartbeat
		expect(mockFetchSnapshot).not.toHaveBeenCalled();

		// After 5 minutes, heartbeat fires
		await vi.advanceTimersByTimeAsync(5 * 60 * 1000);
		expect(mockFetchSnapshot).toHaveBeenCalledTimes(1);
		expect(mockFetchSnapshot).toHaveBeenCalledWith('test-session');

		// After another 5 minutes, another heartbeat
		await vi.advanceTimersByTimeAsync(5 * 60 * 1000);
		expect(mockFetchSnapshot).toHaveBeenCalledTimes(2);

		expect(onSessionExpired).not.toHaveBeenCalled();
	});

	it('calls onSessionExpired when session has expired', async () => {
		const mountedRef = { current: true };
		const onSessionExpired = vi.fn();
		const expiredError = new GameApiError(
			'Session not found',
			404,
			'Not Found',
			{ code: 'NOT_FOUND', message: 'Session "test" was not found.' },
		);
		mockFetchSnapshot.mockRejectedValue(expiredError);

		renderHook(() =>
			useSessionHeartbeat({
				sessionId: 'test-session',
				mountedRef,
				onSessionExpired,
			}),
		);

		await vi.advanceTimersByTimeAsync(5 * 60 * 1000);

		expect(onSessionExpired).toHaveBeenCalledTimes(1);
		expect(onSessionExpired).toHaveBeenCalledWith(expiredError);
	});

	it('stops heartbeat after session expires', async () => {
		const mountedRef = { current: true };
		const onSessionExpired = vi.fn();
		const expiredError = new GameApiError(
			'Session not found',
			404,
			'Not Found',
			{ code: 'NOT_FOUND', message: 'Session "test" was not found.' },
		);
		mockFetchSnapshot.mockRejectedValue(expiredError);

		renderHook(() =>
			useSessionHeartbeat({
				sessionId: 'test-session',
				mountedRef,
				onSessionExpired,
			}),
		);

		// First heartbeat triggers expiry
		await vi.advanceTimersByTimeAsync(5 * 60 * 1000);
		expect(onSessionExpired).toHaveBeenCalledTimes(1);
		mockFetchSnapshot.mockClear();

		// Subsequent intervals should not trigger more heartbeats
		await vi.advanceTimersByTimeAsync(5 * 60 * 1000);
		expect(mockFetchSnapshot).not.toHaveBeenCalled();
	});

	it('ignores non-expiry errors and continues heartbeat', async () => {
		const mountedRef = { current: true };
		const onSessionExpired = vi.fn();
		const networkError = new Error('Network failure');
		mockFetchSnapshot.mockRejectedValueOnce(networkError);
		mockFetchSnapshot.mockResolvedValue({});

		renderHook(() =>
			useSessionHeartbeat({
				sessionId: 'test-session',
				mountedRef,
				onSessionExpired,
			}),
		);

		// First heartbeat fails with network error
		await vi.advanceTimersByTimeAsync(5 * 60 * 1000);
		expect(onSessionExpired).not.toHaveBeenCalled();

		// Next heartbeat succeeds
		await vi.advanceTimersByTimeAsync(5 * 60 * 1000);
		expect(mockFetchSnapshot).toHaveBeenCalledTimes(2);
		expect(onSessionExpired).not.toHaveBeenCalled();
	});

	it('does not call onSessionExpired if unmounted', async () => {
		const mountedRef = { current: true };
		const onSessionExpired = vi.fn();
		const expiredError = new GameApiError(
			'Session not found',
			404,
			'Not Found',
			{ code: 'NOT_FOUND', message: 'Session "test" was not found.' },
		);
		mockFetchSnapshot.mockRejectedValue(expiredError);

		renderHook(() =>
			useSessionHeartbeat({
				sessionId: 'test-session',
				mountedRef,
				onSessionExpired,
			}),
		);

		// Unmount before heartbeat fires
		mountedRef.current = false;
		await vi.advanceTimersByTimeAsync(5 * 60 * 1000);

		expect(onSessionExpired).not.toHaveBeenCalled();
	});

	it('cleans up interval on unmount', () => {
		const mountedRef = { current: true };
		const onSessionExpired = vi.fn();
		mockFetchSnapshot.mockResolvedValue({});

		const { unmount } = renderHook(() =>
			useSessionHeartbeat({
				sessionId: 'test-session',
				mountedRef,
				onSessionExpired,
			}),
		);

		unmount();

		// Advance time past the interval
		vi.advanceTimersByTime(10 * 60 * 1000);

		// No heartbeats should have fired
		expect(mockFetchSnapshot).not.toHaveBeenCalled();
	});
});
