/** @vitest-environment jsdom */
import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Screen } from '../../src/state/appHistory';
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
		return hook;
	}

	it('restores stored dark mode preference when history is missing it', async () => {
		window.localStorage.setItem(DARK_MODE_PREFERENCE_STORAGE_KEY, 'true');
		const { result, unmount } = await renderNavigationHook();

		expect(result.current.isDarkMode).toBe(true);
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
		const { result, unmount } = await renderNavigationHook();

		expect(result.current.resumeSessionId).toBe(resumeRecord.sessionId);
		expect(result.current.resumePoint).toEqual(resumeRecord);
		unmount();
	});

	it('clears stored resume session when starting a new game', async () => {
		const resumeRecord: ResumeSessionRecord = {
			sessionId: 'resume-session-new',
			turn: 7,
			devMode: false,
			updatedAt: Date.UTC(2024, 0, 2),
		};
		writeStoredResumeSession(resumeRecord);
		const { result, unmount } = await renderNavigationHook();

		act(() => {
			result.current.startStandardGame();
		});

		expect(result.current.resumeSessionId).toBeNull();
		expect(result.current.resumePoint).toBeNull();
		expect(window.localStorage.getItem(RESUME_SESSION_STORAGE_KEY)).toBeNull();
		unmount();
	});

	it('clears stored resume session when starting a developer game', async () => {
		const resumeRecord: ResumeSessionRecord = {
			sessionId: 'resume-session-dev',
			turn: 11,
			devMode: true,
			updatedAt: Date.UTC(2024, 0, 3),
		};
		writeStoredResumeSession(resumeRecord);
		const { result, unmount } = await renderNavigationHook();

		act(() => {
			result.current.startDeveloperGame();
		});

		expect(result.current.resumeSessionId).toBeNull();
		expect(result.current.resumePoint).toBeNull();
		expect(window.localStorage.getItem(RESUME_SESSION_STORAGE_KEY)).toBeNull();
		unmount();
	});

	it('restores stored gameplay preferences when history is missing them', async () => {
		window.localStorage.setItem(
			AUTO_ACKNOWLEDGE_PREFERENCE_STORAGE_KEY,
			'true',
		);
		window.localStorage.setItem(AUTO_PASS_PREFERENCE_STORAGE_KEY, 'true');

		const { result, unmount } = await renderNavigationHook();

		expect(result.current.isAutoAcknowledgeEnabled).toBe(true);
		expect(result.current.isAutoPassEnabled).toBe(true);
		unmount();
	});

	it('does not touch browser history when returning to the menu from the menu', async () => {
		const pushSpy = vi.spyOn(window.history, 'pushState');
		const replaceSpy = vi.spyOn(window.history, 'replaceState');
		const { result, unmount } = await renderNavigationHook();
		pushSpy.mockClear();
		replaceSpy.mockClear();

		act(() => {
			result.current.returnToMenu();
		});

		expect(pushSpy).not.toHaveBeenCalled();
		expect(replaceSpy).not.toHaveBeenCalled();
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

	it('persists gameplay preferences across reloads', async () => {
		const firstRender = await renderNavigationHook();

		expect(firstRender.result.current.isAutoAcknowledgeEnabled).toBe(false);
		expect(firstRender.result.current.isAutoPassEnabled).toBe(false);

		act(() => {
			firstRender.result.current.toggleAutoAcknowledge();
		});

		expect(
			window.localStorage.getItem(AUTO_ACKNOWLEDGE_PREFERENCE_STORAGE_KEY),
		).toBe('true');

		act(() => {
			firstRender.result.current.toggleAutoPass();
		});

		expect(window.localStorage.getItem(AUTO_PASS_PREFERENCE_STORAGE_KEY)).toBe(
			'true',
		);

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

	it('continues a saved game and updates dev mode without touching browser history', async () => {
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
		expect(pushSpy).not.toHaveBeenCalled();
		unmount();
	});

	it('persists resume session updates and syncs storage', async () => {
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
		expect(readStoredResumeSession()).toBeUndefined();
		unmount();
	});
});
