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
import {
	AUTO_ACKNOWLEDGE_PREFERENCE_STORAGE_KEY,
	AUTO_PASS_PREFERENCE_STORAGE_KEY,
} from '../../src/state/gameplayPreferences';
import {
	RESUME_SESSION_STORAGE_KEY,
	readStoredResumeSession,
	type ResumeSessionRecord,
	writeStoredResumeSession,
} from '../../src/state/sessionResumeStorage';

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

	it('restores stored resume session data when available', async () => {
		const resumeRecord: ResumeSessionRecord = {
			sessionId: 'resume-session',
			turn: 5,
			devMode: true,
			updatedAt: Date.UTC(2024, 0, 1),
		};
		writeStoredResumeSession(resumeRecord);
		const { result, menuState, unmount } = await renderNavigationHook();

		expect(result.current.resumeSessionId).toBe(resumeRecord.sessionId);
		expect(result.current.resumePoint).toEqual(resumeRecord);
		expect(menuState.resumeSessionId).toBe(resumeRecord.sessionId);
		unmount();
	});

	it('clears pending resume data when starting a new game', async () => {
		const resumeRecord: ResumeSessionRecord = {
			sessionId: 'resume-new-game',
			turn: 2,
			devMode: false,
			updatedAt: Date.UTC(2024, 0, 1),
		};
		writeStoredResumeSession(resumeRecord);
		const { result, unmount } = await renderNavigationHook();

		act(() => {
			result.current.startStandardGame();
		});

		expect(result.current.resumeSessionId).toBeNull();
		expect(result.current.resumePoint).toBeNull();
		expect((window.history.state as HistoryState).resumeSessionId).toBeNull();
		unmount();
	});

	it('restores stored gameplay preferences when history is missing them', async () => {
		window.localStorage.setItem(
			AUTO_ACKNOWLEDGE_PREFERENCE_STORAGE_KEY,
			'true',
		);
		window.localStorage.setItem(AUTO_PASS_PREFERENCE_STORAGE_KEY, 'true');

		const { result, menuState, unmount } = await renderNavigationHook();

		expect(result.current.isAutoAcknowledgeEnabled).toBe(true);
		expect(result.current.isAutoPassEnabled).toBe(true);
		expect(menuState.isAutoAcknowledgeEnabled).toBe(true);
		expect(menuState.isAutoPassEnabled).toBe(true);
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

	it('persists gameplay preferences across reloads and syncs history', async () => {
		const firstRender = await renderNavigationHook();

		expect(firstRender.result.current.isAutoAcknowledgeEnabled).toBe(false);
		expect(firstRender.result.current.isAutoPassEnabled).toBe(false);

		act(() => {
			firstRender.result.current.toggleAutoAcknowledge();
		});

		expect(
			window.localStorage.getItem(AUTO_ACKNOWLEDGE_PREFERENCE_STORAGE_KEY),
		).toBe('true');
		expect(
			(window.history.state as HistoryState).isAutoAcknowledgeEnabled,
		).toBe(true);

		act(() => {
			firstRender.result.current.toggleAutoPass();
		});

		expect(window.localStorage.getItem(AUTO_PASS_PREFERENCE_STORAGE_KEY)).toBe(
			'true',
		);
		expect((window.history.state as HistoryState).isAutoPassEnabled).toBe(true);

		firstRender.unmount();

		const secondRender = await renderNavigationHook();
		expect(secondRender.result.current.isAutoAcknowledgeEnabled).toBe(true);
		expect(secondRender.result.current.isAutoPassEnabled).toBe(true);
		secondRender.unmount();
	});

	it('enables gameplay preferences when starting a developer game', async () => {
		const { result, unmount } = await renderNavigationHook();

		act(() => {
			result.current.startDeveloperGame();
		});

		const historyState = window.history.state as HistoryState;
		expect(historyState.isAutoAcknowledgeEnabled).toBe(true);
		expect(historyState.isAutoPassEnabled).toBe(true);
		expect(result.current.isAutoAcknowledgeEnabled).toBe(true);
		expect(result.current.isAutoPassEnabled).toBe(true);
		expect(
			window.localStorage.getItem(AUTO_ACKNOWLEDGE_PREFERENCE_STORAGE_KEY),
		).toBe('true');
		expect(window.localStorage.getItem(AUTO_PASS_PREFERENCE_STORAGE_KEY)).toBe(
			'true',
		);
		unmount();
	});

	it('continues a saved game and updates history and dev mode', async () => {
		const resumeRecord: ResumeSessionRecord = {
			sessionId: 'resume-dev',
			turn: 9,
			devMode: true,
			updatedAt: Date.UTC(2024, 0, 1),
		};
		writeStoredResumeSession(resumeRecord);
		const pushSpy = vi.spyOn(window.history, 'pushState');
		const { result, unmount } = await renderNavigationHook();
		pushSpy.mockClear();

		act(() => {
			result.current.continueSavedGame();
		});

		expect(result.current.currentScreen).toBe(Screen.Game);
		expect(result.current.isDevMode).toBe(true);
		expect(result.current.currentGameKey).toBe(1);
		expect(pushSpy).toHaveBeenCalledWith(
			expect.objectContaining({
				screen: Screen.Game,
				resumeSessionId: resumeRecord.sessionId,
				isDevModeEnabled: true,
			}),
			'',
			SCREEN_PATHS[Screen.Game],
		);
		unmount();
	});

	it('persists resume session updates and syncs storage and history', async () => {
		const { result, unmount } = await renderNavigationHook();
		const resumeRecord: ResumeSessionRecord = {
			sessionId: 'resume-save',
			turn: 3,
			devMode: false,
			updatedAt: Date.UTC(2024, 0, 1),
		};

		act(() => {
			result.current.persistResumeSession(resumeRecord);
		});

		expect(result.current.resumeSessionId).toBe(resumeRecord.sessionId);
		expect(result.current.resumePoint).toEqual(resumeRecord);
		expect((window.history.state as HistoryState).resumeSessionId).toBe(
			resumeRecord.sessionId,
		);
		expect(readStoredResumeSession()).toEqual(resumeRecord);
		unmount();
	});

	it('clears resume session state when requested', async () => {
		const { result, unmount } = await renderNavigationHook();
		const resumeRecord: ResumeSessionRecord = {
			sessionId: 'resume-clear',
			turn: 12,
			devMode: false,
			updatedAt: Date.UTC(2024, 0, 1),
		};

		act(() => {
			result.current.persistResumeSession(resumeRecord);
		});

		act(() => {
			result.current.clearResumeSession();
		});

		expect(result.current.resumeSessionId).toBeNull();
		expect(result.current.resumePoint).toBeNull();
		expect((window.history.state as HistoryState).resumeSessionId).toBeNull();
		expect(window.localStorage.getItem(RESUME_SESSION_STORAGE_KEY)).toBeNull();
		unmount();
	});

	it('clears resume session data when handling a resume failure', async () => {
		const { result, unmount } = await renderNavigationHook();
		const resumeRecord: ResumeSessionRecord = {
			sessionId: 'resume-failure',
			turn: 4,
			devMode: true,
			updatedAt: Date.UTC(2024, 0, 1),
		};

		act(() => {
			result.current.persistResumeSession(resumeRecord);
		});

		act(() => {
			result.current.handleResumeSessionFailure({
				sessionId: resumeRecord.sessionId,
				error: new Error('resume failed'),
			});
		});

		expect(result.current.resumeSessionId).toBeNull();
		expect(result.current.resumePoint).toBeNull();
		expect((window.history.state as HistoryState).resumeSessionId).toBeNull();
		expect(readStoredResumeSession()).toBeUndefined();
		unmount();
	});
});
