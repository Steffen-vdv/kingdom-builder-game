import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { JSDOM } from 'jsdom';
import { useAppNavigation } from '../../src/state/useAppNavigation';
import { Screen } from '../../src/state/appHistory';
import { DARK_MODE_PREFERENCE_STORAGE_KEY } from '../../src/state/darkModePreference';

const jsdom = new JSDOM('<!doctype html><html><body></body></html>', {
	url: 'https://localhost/',
});
vi.stubGlobal('window', jsdom.window as unknown as typeof globalThis);
vi.stubGlobal('document', jsdom.window.document);
vi.stubGlobal('navigator', jsdom.window.navigator);

interface MockMediaQueryList {
	matches: boolean;
	media: string;
	addEventListener: ReturnType<typeof vi.fn>;
	removeEventListener: ReturnType<typeof vi.fn>;
	addListener: ReturnType<typeof vi.fn>;
	removeListener: ReturnType<typeof vi.fn>;
	dispatchEvent: ReturnType<typeof vi.fn>;
}

const createMediaQueryList = (matches: () => boolean): MockMediaQueryList => ({
	get matches() {
		return matches();
	},
	media: '(prefers-color-scheme: dark)',
	addEventListener: vi.fn(),
	removeEventListener: vi.fn(),
	addListener: vi.fn(),
	removeListener: vi.fn(),
	dispatchEvent: vi.fn(),
});

describe('useAppNavigation dark mode preferences', () => {
	let systemPrefersDark = false;
	let matchMediaMock: ReturnType<typeof vi.fn>;

	const setSystemPreference = (value: boolean) => {
		systemPrefersDark = value;
	};

	beforeEach(() => {
		systemPrefersDark = false;
		matchMediaMock = vi
			.fn()
			.mockImplementation(() => createMediaQueryList(() => systemPrefersDark));
		Object.defineProperty(window, 'matchMedia', {
			configurable: true,
			value: matchMediaMock,
		});
		window.localStorage.clear();
		document.documentElement.classList.remove('dark');
		window.history.replaceState(null, '', '/');
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('initializes from stored preference when available', () => {
		window.localStorage.setItem(DARK_MODE_PREFERENCE_STORAGE_KEY, 'false');
		setSystemPreference(true);

		const { result } = renderHook(() => useAppNavigation());

		expect(result.current.isDarkMode).toBe(false);
		expect(document.documentElement.classList.contains('dark')).toBe(false);
	});

	it('falls back to system preference when storage is empty', () => {
		setSystemPreference(true);

		const { result } = renderHook(() => useAppNavigation());

		expect(result.current.isDarkMode).toBe(true);
		expect(document.documentElement.classList.contains('dark')).toBe(true);
	});

	it('persists toggled preference for future sessions', () => {
		setSystemPreference(false);

		const { result, unmount } = renderHook(() => useAppNavigation());

		act(() => {
			result.current.toggleDarkMode();
		});

		expect(window.localStorage.getItem(DARK_MODE_PREFERENCE_STORAGE_KEY)).toBe(
			'true',
		);

		unmount();
		setSystemPreference(false);

		const { result: rerendered } = renderHook(() => useAppNavigation());

		expect(rerendered.current.isDarkMode).toBe(true);
		expect(document.documentElement.classList.contains('dark')).toBe(true);
	});

	it('restores stored preference when history state omits the field', () => {
		setSystemPreference(false);

		const { result } = renderHook(() => useAppNavigation());

		act(() => {
			result.current.toggleDarkMode();
		});

		expect(result.current.isDarkMode).toBe(true);

		window.localStorage.setItem(DARK_MODE_PREFERENCE_STORAGE_KEY, 'false');

		act(() => {
			const state = { screen: Screen.Menu } as const;
			window.dispatchEvent(new window.PopStateEvent('popstate', { state }));
		});

		expect(result.current.isDarkMode).toBe(false);
		expect(document.documentElement.classList.contains('dark')).toBe(false);
	});
});
