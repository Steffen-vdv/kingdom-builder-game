/** @vitest-environment jsdom */
import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
	DARK_MODE_PREFERENCE_STORAGE_KEY,
	getStoredDarkModePreference,
	useDarkModePreference,
} from '../../src/state/darkModePreference';

type MatchMediaFactory = (query: string) => MediaQueryList;

function createMatchMediaMock(
	getMatches: () => boolean,
): ReturnType<typeof vi.fn<MatchMediaFactory>> {
	return vi.fn<MatchMediaFactory>().mockImplementation((query: string) => ({
		matches: getMatches(),
		media: query,
		onchange: null,
		addEventListener: vi.fn(),
		removeEventListener: vi.fn(),
		dispatchEvent: vi.fn(),
		addListener: vi.fn(),
		removeListener: vi.fn(),
	}));
}

class StorageStub implements Storage {
	private readonly store = new Map<string, string>();

	get length(): number {
		return this.store.size;
	}

	clear(): void {
		this.store.clear();
	}

	getItem(key: string): string | null {
		return this.store.has(key) ? this.store.get(key)! : null;
	}

	key(index: number): string | null {
		return Array.from(this.store.keys())[index] ?? null;
	}

	removeItem(key: string): void {
		this.store.delete(key);
	}

	setItem(key: string, value: string): void {
		this.store.set(key, value);
	}
}

describe('useDarkModePreference', () => {
	const originalMatchMedia = window.matchMedia;
	const originalLocalStorage = window.localStorage;
	let systemPreference: boolean;
	let matchMediaMock: ReturnType<typeof createMatchMediaMock>;
	let storageStub: StorageStub;

	beforeEach(() => {
		systemPreference = false;
		matchMediaMock = createMatchMediaMock(() => systemPreference);
		Object.defineProperty(window, 'matchMedia', {
			configurable: true,
			writable: true,
			value: matchMediaMock,
		});
		storageStub = new StorageStub();
		Object.defineProperty(window, 'localStorage', {
			configurable: true,
			value: storageStub,
		});
	});

	afterEach(() => {
		Object.defineProperty(window, 'matchMedia', {
			configurable: true,
			writable: true,
			value: originalMatchMedia,
		});
		Object.defineProperty(window, 'localStorage', {
			configurable: true,
			value: originalLocalStorage,
		});
		vi.restoreAllMocks();
	});

	it.each([{ systemPreferenceValue: true }, { systemPreferenceValue: false }])(
		'returns the system preference when storage has no entry',
		({ systemPreferenceValue }) => {
			systemPreference = systemPreferenceValue;
			const hook = renderHook(() => useDarkModePreference());

			expect(hook.result.current[0]).toBe(systemPreferenceValue);
			hook.unmount();
		},
	);

	it('writes string values when toggled', () => {
		const setItemSpy = vi.spyOn(window.localStorage, 'setItem');
		const hook = renderHook(() => useDarkModePreference());

		expect(setItemSpy).not.toHaveBeenCalled();
		act(() => {
			hook.result.current[1](true);
		});

		expect(setItemSpy).toHaveBeenNthCalledWith(
			1,
			DARK_MODE_PREFERENCE_STORAGE_KEY,
			'true',
		);
		expect(storageStub.getItem(DARK_MODE_PREFERENCE_STORAGE_KEY)).toBe('true');

		act(() => {
			hook.result.current[1]((previousValue) => !previousValue);
		});

		expect(setItemSpy).toHaveBeenNthCalledWith(
			2,
			DARK_MODE_PREFERENCE_STORAGE_KEY,
			'false',
		);
		expect(storageStub.getItem(DARK_MODE_PREFERENCE_STORAGE_KEY)).toBe('false');
		hook.unmount();
	});

	it('ignores storage failures when persisting the preference', () => {
		const setItemSpy = vi
			.spyOn(window.localStorage, 'setItem')
			.mockImplementation(() => {
				throw new Error('blocked');
			});
		const hook = renderHook(() => useDarkModePreference());

		act(() => {
			hook.result.current[1](true);
		});

		expect(hook.result.current[0]).toBe(true);
		expect(storageStub.getItem(DARK_MODE_PREFERENCE_STORAGE_KEY)).toBeNull();
		expect(setItemSpy).toHaveBeenCalledWith(
			DARK_MODE_PREFERENCE_STORAGE_KEY,
			'true',
		);
		hook.unmount();
	});
});

describe('getStoredDarkModePreference', () => {
	it('returns true when window is undefined', () => {
		const globalScope = globalThis as { window?: Window };
		const previousWindow = globalScope.window;

		globalScope.window = undefined;
		try {
			expect(getStoredDarkModePreference()).toBe(true);
		} finally {
			globalScope.window = previousWindow;
		}
	});

	it('returns true when matchMedia is unavailable', () => {
		const globalScope = globalThis as { window?: Window };
		const previousWindow = globalScope.window;
		const minimalWindow = {
			localStorage: window.localStorage,
		} as unknown as Window;

		globalScope.window = minimalWindow;
		try {
			expect(getStoredDarkModePreference()).toBe(true);
		} finally {
			globalScope.window = previousWindow;
		}
	});

	it('uses the system preference when localStorage is missing', () => {
		const globalScope = globalThis as { window?: Window };
		const previousWindow = globalScope.window;
		const systemPreference = false;
		const minimalWindow = {
			matchMedia: createMatchMediaMock(() => systemPreference),
		} as unknown as Window;

		globalScope.window = minimalWindow;
		try {
			expect(getStoredDarkModePreference()).toBe(systemPreference);
		} finally {
			globalScope.window = previousWindow;
		}
	});
});
