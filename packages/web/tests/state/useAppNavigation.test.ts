/** @vitest-environment jsdom */
import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
	Screen,
	SCREEN_PATHS,
	type HistoryState,
} from '../../src/state/appHistory';
import { useAppNavigation } from '../../src/state/useAppNavigation';
import { DARK_MODE_PREFERENCE_STORAGE_KEY } from '../../src/state/darkModePreference';

describe('useAppNavigation', () => {
	const originalMatchMedia = window.matchMedia;

	beforeEach(() => {
		window.localStorage.clear();
		window.history.replaceState(null, '', SCREEN_PATHS[Screen.Menu]);
		const matchMediaMock = vi.fn().mockImplementation((query: string) => ({
			matches: false,
			media: query,
			onchange: null,
			addEventListener: vi.fn(),
			removeEventListener: vi.fn(),
			dispatchEvent: vi.fn(),
			addListener: vi.fn(),
			removeListener: vi.fn(),
		}));
		Object.defineProperty(window, 'matchMedia', {
			configurable: true,
			writable: true,
			value: matchMediaMock,
		});
	});

	afterEach(() => {
		Object.defineProperty(window, 'matchMedia', {
			configurable: true,
			writable: true,
			value: originalMatchMedia,
		});
		vi.restoreAllMocks();
	});

	async function renderNavigationHook() {
		const hook = renderHook(() => useAppNavigation());
		await waitFor(() => {
			expect(hook.result.current.currentScreen).toBe(Screen.Menu);
		});
		const menuState = window.history.state as HistoryState;
		expect(menuState?.screen).toBe(Screen.Menu);
		return { ...hook, menuState };
	}

	it('restores stored dark mode preference when history is missing it', async () => {
		window.localStorage.setItem(DARK_MODE_PREFERENCE_STORAGE_KEY, 'true');
		const { result, menuState, unmount } = await renderNavigationHook();

		expect(result.current.isDarkMode).toBe(true);
		expect(menuState.isDarkModeEnabled).toBe(true);
		unmount();
	});

	it('replaces history when returning to the menu from the menu', async () => {
		const pushSpy = vi.spyOn(window.history, 'pushState');
		const replaceSpy = vi.spyOn(window.history, 'replaceState');
		const { result, unmount } = await renderNavigationHook();
		pushSpy.mockClear();
		replaceSpy.mockClear();

		act(() => {
			result.current.returnToMenu();
		});

		expect(pushSpy).not.toHaveBeenCalled();
		expect(replaceSpy).toHaveBeenCalledWith(
			expect.objectContaining({ screen: Screen.Menu }),
			'',
			SCREEN_PATHS[Screen.Menu],
		);
		unmount();
	});

	it('restores the menu when navigating back from the game', async () => {
		const { result, menuState, unmount } = await renderNavigationHook();

		act(() => {
			result.current.startStandardGame();
		});
		expect(result.current.currentScreen).toBe(Screen.Game);

		act(() => {
			window.dispatchEvent(new PopStateEvent('popstate', { state: menuState }));
		});

		expect(result.current.currentScreen).toBe(Screen.Menu);
		unmount();
	});

	it('restores the menu when navigating back from the overview', async () => {
		const { result, menuState, unmount } = await renderNavigationHook();

		act(() => {
			result.current.openOverview();
		});
		expect(result.current.currentScreen).toBe(Screen.Overview);

		act(() => {
			window.dispatchEvent(new PopStateEvent('popstate', { state: menuState }));
		});

		expect(result.current.currentScreen).toBe(Screen.Menu);
		unmount();
	});

	it('restores the menu when navigating back from the tutorial', async () => {
		const { result, menuState, unmount } = await renderNavigationHook();

		act(() => {
			result.current.openTutorial();
		});
		expect(result.current.currentScreen).toBe(Screen.Tutorial);

		act(() => {
			window.dispatchEvent(new PopStateEvent('popstate', { state: menuState }));
		});

		expect(result.current.currentScreen).toBe(Screen.Menu);
		unmount();
	});

	it('persists dark mode preference across reloads', async () => {
		const firstRender = await renderNavigationHook();

		expect(firstRender.result.current.isDarkMode).toBe(false);

		act(() => {
			firstRender.result.current.toggleDarkMode();
		});

		expect(window.localStorage.getItem(DARK_MODE_PREFERENCE_STORAGE_KEY)).toBe(
			'true',
		);

		firstRender.unmount();

		const secondRender = await renderNavigationHook();
		expect(secondRender.result.current.isDarkMode).toBe(true);
		secondRender.unmount();
	});
});
