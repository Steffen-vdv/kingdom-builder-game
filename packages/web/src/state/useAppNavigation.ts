import { useCallback, useEffect, useState } from 'react';
import {
	Screen,
	SCREEN_PATHS,
	getScreenFromPath,
	type HistoryState,
} from './appHistory';
import {
	getStoredAudioPreferences,
	useAudioPreferences,
} from './audioPreferences';
import {
	getStoredGameplayPreferences,
	useGameplayPreferences,
} from './gameplayPreferences';
import type { AppNavigationState } from './appNavigationState';
import { useAudioPreferenceToggles } from './useAudioPreferenceToggles';
import { useGameplayPreferenceToggles } from './useGameplayPreferenceToggles';
import type { ResumeSessionRecord } from './sessionResumeStorage';
import { useHistoryNavigation } from './useHistoryNavigation';
import { useResumeSessionState } from './useResumeSessionState';
import { useContinueSavedGame } from './useContinueSavedGame';
import {
	getStoredDarkModePreference,
	useDarkModePreference,
} from './darkModePreference';

export function useAppNavigation(): AppNavigationState {
	const [currentScreen, setCurrentScreen] = useState<Screen>(Screen.Menu);
	const [currentGameKey, setCurrentGameKey] = useState(0);
	const [isDarkMode, setIsDarkMode] = useDarkModePreference();
	const [isDevMode, setIsDevMode] = useState(false);
	const {
		isMusicEnabled,
		setIsMusicEnabled,
		isSoundEnabled,
		setIsSoundEnabled,
		isBackgroundAudioMuted,
		setIsBackgroundAudioMuted,
	} = useAudioPreferences();
	const {
		isAutoAcknowledgeEnabled,
		setIsAutoAcknowledgeEnabled,
		isAutoPassEnabled,
		setIsAutoPassEnabled,
	} = useGameplayPreferences();
	const {
		resumePoint,
		resumeSessionId,
		updateFromHistory,
		suspendResumeSession,
		persistResumeSession: persistResumeSessionState,
		clearResumeSession: clearResumeSessionState,
		handleResumeSessionFailure: handleResumeSessionFailureState,
	} = useResumeSessionState();
	const { pushHistoryState, replaceHistoryState } = useHistoryNavigation();
	const buildHistoryState = useCallback(
		(overrides?: Partial<HistoryState>): HistoryState => {
			const {
				screen: nextScreen = currentScreen,
				gameKey: nextGameKey = currentGameKey,
				isDarkModeEnabled: overrideDark,
				isDevModeEnabled: overrideDev,
				isMusicEnabled: overrideMusic,
				isSoundEnabled: overrideSound,
				isBackgroundAudioMuted: overrideBackgroundMute,
				isAutoAcknowledgeEnabled: overrideAutoAcknowledge,
				isAutoPassEnabled: overrideAutoPass,
				resumeSessionId: overrideResumeSessionId,
			} = overrides ?? {};
			const nextDarkMode = overrideDark ?? isDarkMode;
			const nextDevMode = overrideDev ?? isDevMode;
			const nextMusic = overrideMusic ?? isMusicEnabled;
			const nextSound = overrideSound ?? isSoundEnabled;
			const nextBackgroundMute =
				overrideBackgroundMute ?? isBackgroundAudioMuted;
			const nextAutoAcknowledge =
				overrideAutoAcknowledge ?? isAutoAcknowledgeEnabled;
			const nextAutoPass = overrideAutoPass ?? isAutoPassEnabled;
			const nextResumeSessionId =
				overrideResumeSessionId !== undefined
					? overrideResumeSessionId
					: resumeSessionId;

			return {
				screen: nextScreen,
				gameKey: nextGameKey,
				isDarkModeEnabled: nextDarkMode,
				isDevModeEnabled: nextDevMode,
				isMusicEnabled: nextMusic,
				isSoundEnabled: nextSound,
				isBackgroundAudioMuted: nextBackgroundMute,
				isAutoAcknowledgeEnabled: nextAutoAcknowledge,
				isAutoPassEnabled: nextAutoPass,
				resumeSessionId: nextResumeSessionId ?? null,
			};
		},
		[
			currentScreen,
			currentGameKey,
			isDarkMode,
			isDevMode,
			isMusicEnabled,
			isSoundEnabled,
			isBackgroundAudioMuted,
			isAutoAcknowledgeEnabled,
			isAutoPassEnabled,
			resumeSessionId,
		],
	);
	const applyHistoryState = useCallback(
		(state: HistoryState | null, fallbackScreen: Screen): HistoryState => {
			const { music, sound, backgroundMute } = getStoredAudioPreferences();
			const { autoAcknowledge, autoPass } = getStoredGameplayPreferences();
			const darkMode = getStoredDarkModePreference();
			const nextResumeSessionId = state
				? state.resumeSessionId
				: resumeSessionId;
			updateFromHistory(nextResumeSessionId ?? null);
			const nextState: HistoryState = {
				screen: state?.screen ?? fallbackScreen,
				gameKey: state?.gameKey ?? 0,
				isDarkModeEnabled: state?.isDarkModeEnabled ?? darkMode,
				isDevModeEnabled: state?.isDevModeEnabled ?? false,
				isMusicEnabled: state?.isMusicEnabled ?? music,
				isSoundEnabled: state?.isSoundEnabled ?? sound,
				isBackgroundAudioMuted: state?.isBackgroundAudioMuted ?? backgroundMute,
				isAutoAcknowledgeEnabled:
					state?.isAutoAcknowledgeEnabled ?? autoAcknowledge,
				isAutoPassEnabled: state?.isAutoPassEnabled ?? autoPass,
				resumeSessionId: nextResumeSessionId ?? null,
			};

			setCurrentScreen(nextState.screen);
			setCurrentGameKey(nextState.gameKey);
			setIsDarkMode(nextState.isDarkModeEnabled);
			setIsDevMode(nextState.isDevModeEnabled);
			setIsMusicEnabled(nextState.isMusicEnabled);
			setIsSoundEnabled(nextState.isSoundEnabled);
			setIsBackgroundAudioMuted(nextState.isBackgroundAudioMuted);
			setIsAutoAcknowledgeEnabled(nextState.isAutoAcknowledgeEnabled);
			setIsAutoPassEnabled(nextState.isAutoPassEnabled);

			return nextState;
		},
		[
			setCurrentScreen,
			setCurrentGameKey,
			setIsDarkMode,
			setIsDevMode,
			setIsMusicEnabled,
			setIsSoundEnabled,
			setIsBackgroundAudioMuted,
			setIsAutoAcknowledgeEnabled,
			setIsAutoPassEnabled,
			updateFromHistory,
			resumeSessionId,
		],
	);
	useEffect(() => {
		if (typeof document === 'undefined') {
			return;
		}
		document.documentElement.classList.toggle('dark', isDarkMode);
	}, [isDarkMode]);

	useEffect(() => {
		if (typeof window === 'undefined') {
			return;
		}
		const { history, location } = window;
		const initialScreenFromPath = getScreenFromPath(location.pathname);
		const historyState = history.state as HistoryState | null;
		// prettier-ignore
		const nextState = applyHistoryState(
			historyState,
			initialScreenFromPath,
		);
		const targetPath = SCREEN_PATHS[nextState.screen];
		replaceHistoryState(nextState, targetPath);
	}, [applyHistoryState, replaceHistoryState]);
	useEffect(() => {
		if (typeof window === 'undefined') {
			return;
		}
		const handlePopState = (event: PopStateEvent) => {
			const state = event.state as HistoryState | null;
			applyHistoryState(state, Screen.Menu);
		};

		window.addEventListener('popstate', handlePopState);
		return () => {
			window.removeEventListener('popstate', handlePopState);
		};
	}, [applyHistoryState]);
	const returnToMenu = useCallback(() => {
		const nextState = buildHistoryState({ screen: Screen.Menu });
		setCurrentScreen(Screen.Menu);
		if (currentScreen === Screen.Menu) {
			replaceHistoryState(nextState, SCREEN_PATHS[Screen.Menu]);
			return;
		}
		pushHistoryState(nextState, SCREEN_PATHS[Screen.Menu]);
	}, [buildHistoryState, currentScreen, pushHistoryState, replaceHistoryState]);
	const toggleDarkMode = useCallback(() => {
		setIsDarkMode((previousDarkMode) => {
			const nextDarkMode = !previousDarkMode;
			replaceHistoryState(
				buildHistoryState({
					isDarkModeEnabled: nextDarkMode,
				}),
			);
			return nextDarkMode;
		});
	}, [buildHistoryState, replaceHistoryState]);

	const startStandardGame = useCallback(() => {
		const nextGameKey = currentGameKey + 1;
		suspendResumeSession();
		setIsDevMode(false);
		setCurrentGameKey(nextGameKey);
		setCurrentScreen(Screen.Game);
		pushHistoryState(
			buildHistoryState({
				screen: Screen.Game,
				gameKey: nextGameKey,
				isDevModeEnabled: false,
				resumeSessionId: null,
			}),
			SCREEN_PATHS[Screen.Game],
		);
	}, [
		buildHistoryState,
		currentGameKey,
		pushHistoryState,
		suspendResumeSession,
	]);

	const startDeveloperGame = useCallback(() => {
		const nextGameKey = currentGameKey + 1;
		suspendResumeSession();
		setIsDevMode(true);
		setIsAutoAcknowledgeEnabled(true);
		setIsAutoPassEnabled(true);
		setCurrentGameKey(nextGameKey);
		setCurrentScreen(Screen.Game);
		pushHistoryState(
			buildHistoryState({
				screen: Screen.Game,
				gameKey: nextGameKey,
				isDevModeEnabled: true,
				isAutoAcknowledgeEnabled: true,
				isAutoPassEnabled: true,
				resumeSessionId: null,
			}),
			SCREEN_PATHS[Screen.Game],
		);
	}, [
		buildHistoryState,
		currentGameKey,
		pushHistoryState,
		suspendResumeSession,
	]);

	const openOverview = useCallback(() => {
		setCurrentScreen(Screen.Overview);
		const overviewState = buildHistoryState({
			screen: Screen.Overview,
		});
		pushHistoryState(overviewState, SCREEN_PATHS[Screen.Overview]);
	}, [buildHistoryState, pushHistoryState]);

	const openTutorial = useCallback(() => {
		setCurrentScreen(Screen.Tutorial);
		const tutorialState = buildHistoryState({
			screen: Screen.Tutorial,
		});
		pushHistoryState(tutorialState, SCREEN_PATHS[Screen.Tutorial]);
	}, [buildHistoryState, pushHistoryState]);
	const updateResumeHistory = useCallback(
		(nextSessionId: string | null) => {
			replaceHistoryState(
				buildHistoryState({
					resumeSessionId: nextSessionId,
				}),
			);
		},
		[buildHistoryState, replaceHistoryState],
	);
	const continueSavedGame = useContinueSavedGame({
		resumePoint,
		currentGameKey,
		setCurrentGameKey,
		setCurrentScreen,
		setIsDevMode,
		buildHistoryState,
		pushHistoryState,
	});
	const persistResumeSession = useCallback(
		(record: ResumeSessionRecord) => {
			persistResumeSessionState(record, updateResumeHistory);
		},
		[persistResumeSessionState, updateResumeHistory],
	);
	const clearResumeSession = useCallback(
		(sessionId?: string | null) => {
			clearResumeSessionState(updateResumeHistory, sessionId);
		},
		[clearResumeSessionState, updateResumeHistory],
	);
	const handleResumeSessionFailure = useCallback(
		(options: { sessionId: string; error: unknown }) => {
			handleResumeSessionFailureState(updateResumeHistory, options);
		},
		[handleResumeSessionFailureState, updateResumeHistory],
	);

	const { toggleMusic, toggleSound, toggleBackgroundAudioMute } =
		useAudioPreferenceToggles(buildHistoryState, replaceHistoryState, {
			setIsMusicEnabled,
			setIsSoundEnabled,
			setIsBackgroundAudioMuted,
		});
	const { toggleAutoAcknowledge, toggleAutoPass } =
		useGameplayPreferenceToggles(buildHistoryState, replaceHistoryState, {
			setIsAutoAcknowledgeEnabled,
			setIsAutoPassEnabled,
		});

	return {
		currentScreen,
		currentGameKey,
		isDarkMode,
		isDevMode,
		isMusicEnabled,
		isSoundEnabled,
		isBackgroundAudioMuted,
		isAutoAcknowledgeEnabled,
		isAutoPassEnabled,
		resumePoint,
		resumeSessionId,
		startStandardGame,
		startDeveloperGame,
		continueSavedGame,
		openOverview,
		openTutorial,
		returnToMenu,
		toggleDarkMode,
		toggleMusic,
		toggleSound,
		toggleBackgroundAudioMute,
		toggleAutoAcknowledge,
		toggleAutoPass,
		persistResumeSession,
		clearResumeSession,
		handleResumeSessionFailure,
	};
}
