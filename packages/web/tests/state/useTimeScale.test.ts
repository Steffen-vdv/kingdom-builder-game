/** @vitest-environment jsdom */
import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useTimeScale } from '../../src/state/useTimeScale';

describe('useTimeScale', () => {
	const originalLocalStorage = window.localStorage;
	let getItemSpy: ReturnType<typeof vi.fn>;
	let setItemSpy: ReturnType<typeof vi.fn>;

	beforeEach(() => {
		getItemSpy = vi.fn<Storage['getItem']>(() => {
			throw new Error('storage denied');
		});
		setItemSpy = vi.fn<Storage['setItem']>(() => {
			throw new Error('storage denied');
		});
		const storageStub: Storage = {
			get length() {
				return 0;
			},
			clear: vi.fn(),
			getItem: getItemSpy,
			key: vi.fn(() => null),
			removeItem: vi.fn(),
			setItem: setItemSpy,
		};
		Object.defineProperty(window, 'localStorage', {
			configurable: true,
			value: storageStub,
		});
	});

	afterEach(() => {
		Object.defineProperty(window, 'localStorage', {
			configurable: true,
			value: originalLocalStorage,
		});
		vi.restoreAllMocks();
	});

	it('falls back to defaults and keeps controls usable when storage throws', () => {
		const { result } = renderHook(() => useTimeScale({ devMode: false }));

		expect(result.current.timeScale).toBe(1);
		expect(result.current.timeScaleRef.current).toBe(1);
		expect(typeof result.current.setTimeScale).toBe('function');
		expect(typeof result.current.setTrackedTimeout).toBe('function');
		expect(typeof result.current.setTrackedInterval).toBe('function');

		expect(() => {
			act(() => {
				result.current.setTimeScale(2);
			});
		}).not.toThrow();
		expect(result.current.timeScale).toBe(2);
		expect(result.current.timeScaleRef.current).toBe(2);
		expect(setItemSpy).toHaveBeenCalledWith('kingdom-builder:time-scale', '2');
	});
});
