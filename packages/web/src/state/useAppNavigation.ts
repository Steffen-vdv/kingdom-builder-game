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
import type { AppNavigationState } from './appNavigationState';
import { useAudioPreferenceToggles } from './useAudioPreferenceToggles';

export function useAppNavigation(): AppNavigationState {
	const [currentScreen, setCurrentScreen] = useState<Screen>(Screen.Menu);
	const [currentGameKey, setCurrentGameKey] = useState(0);
	const [isDarkMode, setIsDarkMode] = useState(true);
	const [isDevMode, setIsDevMode] = useState(false);
	const {
		isMusicEnabled,
		setIsMusicEnabled,
		isSoundEnabled,
		setIsSoundEnabled,
		isBackgroundAudioMuted,
		setIsBackgroundAudioMuted,
	} = useAudioPreferences();
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
			} = overrides ?? {};
			const nextDarkMode = overrideDark ?? isDarkMode;
			const nextDevMode = overrideDev ?? isDevMode;
			const nextMusic = overrideMusic ?? isMusicEnabled;
			const nextSound = overrideSound ?? isSoundEnabled;
			const nextBackgroundMute =
				overrideBackgroundMute ?? isBackgroundAudioMuted;

			return {
				screen: nextScreen,
				gameKey: nextGameKey,
				isDarkModeEnabled: nextDarkMode,
				isDevModeEnabled: nextDevMode,
				isMusicEnabled: nextMusic,
				isSoundEnabled: nextSound,
				isBackgroundAudioMuted: nextBackgroundMute,
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
		],
	);
	const applyHistoryState = useCallback(
		(state: HistoryState | null, fallbackScreen: Screen): HistoryState => {
			const { music, sound, backgroundMute } = getStoredAudioPreferences();
			const nextState: HistoryState = {
				screen: state?.screen ?? fallbackScreen,
				gameKey: state?.gameKey ?? 0,
				isDarkModeEnabled: state?.isDarkModeEnabled ?? true,
				isDevModeEnabled: state?.isDevModeEnabled ?? false,
				isMusicEnabled: state?.isMusicEnabled ?? music,
				isSoundEnabled: state?.isSoundEnabled ?? sound,
				isBackgroundAudioMuted: state?.isBackgroundAudioMuted ?? backgroundMute,
			};

			setCurrentScreen(nextState.screen);
			setCurrentGameKey(nextState.gameKey);
			setIsDarkMode(nextState.isDarkModeEnabled);
			setIsDevMode(nextState.isDevModeEnabled);
			setIsMusicEnabled(nextState.isMusicEnabled);
			setIsSoundEnabled(nextState.isSoundEnabled);
			setIsBackgroundAudioMuted(nextState.isBackgroundAudioMuted);

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
		],
	);
	const pushHistoryState = useCallback(
		(nextState: HistoryState, path: string) => {
			if (typeof window === 'undefined') {
				return;
			}
			const { history } = window;
			history.pushState(nextState, '', path);
		},
		[],
	);
	const replaceHistoryState = useCallback(
		(nextState: HistoryState, path?: string) => {
			if (typeof window === 'undefined') {
				return;
			}
			const { history, location } = window;
			history.replaceState(nextState, '', path ?? location.pathname);
		},
		[],
	);
	useEffect(() => {
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
		pushHistoryState(nextState, SCREEN_PATHS[Screen.Menu]);
	}, [buildHistoryState, pushHistoryState]);
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
		setIsDevMode(false);
		setCurrentGameKey(nextGameKey);
		setCurrentScreen(Screen.Game);
		pushHistoryState(
			buildHistoryState({
				screen: Screen.Game,
				gameKey: nextGameKey,
				isDevModeEnabled: false,
			}),
			SCREEN_PATHS[Screen.Game],
		);
	}, [buildHistoryState, currentGameKey, pushHistoryState]);

	const startDeveloperGame = useCallback(() => {
		const nextGameKey = currentGameKey + 1;
		setIsDevMode(true);
		setCurrentGameKey(nextGameKey);
		setCurrentScreen(Screen.Game);
		pushHistoryState(
			buildHistoryState({
				screen: Screen.Game,
				gameKey: nextGameKey,
				isDevModeEnabled: true,
			}),
			SCREEN_PATHS[Screen.Game],
		);
	}, [buildHistoryState, currentGameKey, pushHistoryState]);

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

	const { toggleMusic, toggleSound, toggleBackgroundAudioMute } =
		useAudioPreferenceToggles(buildHistoryState, replaceHistoryState, {
			setIsMusicEnabled,
			setIsSoundEnabled,
			setIsBackgroundAudioMuted,
		});

	return {
		currentScreen,
		currentGameKey,
		isDarkMode,
		isDevMode,
		isMusicEnabled,
		isSoundEnabled,
		isBackgroundAudioMuted,
		startStandardGame,
		startDeveloperGame,
		openOverview,
		openTutorial,
		returnToMenu,
		toggleDarkMode,
		toggleMusic,
		toggleSound,
		toggleBackgroundAudioMute,
	};
}
