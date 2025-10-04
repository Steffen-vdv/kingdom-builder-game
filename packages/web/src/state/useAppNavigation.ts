import { useCallback, useEffect, useState } from 'react';
import {
	Screen,
	SCREEN_PATHS,
	getScreenFromPath,
	type HistoryState,
} from './appHistory';

interface AppNavigationState {
	currentScreen: Screen;
	currentGameKey: number;
	isDarkMode: boolean;
	isDevMode: boolean;
	isMusicEnabled: boolean;
	isSoundEnabled: boolean;
	startStandardGame: () => void;
	startDeveloperGame: () => void;
	openOverview: () => void;
	openTutorial: () => void;
	returnToMenu: () => void;
	toggleDarkMode: () => void;
	toggleMusic: () => void;
	toggleSound: () => void;
}

export function useAppNavigation(): AppNavigationState {
	const [currentScreen, setCurrentScreen] = useState<Screen>(Screen.Menu);
	const [currentGameKey, setCurrentGameKey] = useState(0);
	const [isDarkMode, setIsDarkMode] = useState(true);
	const [isDevMode, setIsDevMode] = useState(false);
	const [isMusicEnabled, setIsMusicEnabled] = useState(true);
	const [isSoundEnabled, setIsSoundEnabled] = useState(true);
	const buildHistoryState = useCallback(
		(overrides?: Partial<HistoryState>): HistoryState => {
			const {
				screen: nextScreen = currentScreen,
				gameKey: nextGameKey = currentGameKey,
				isDarkModeEnabled: overrideDark,
				isDevModeEnabled: overrideDev,
				isMusicEnabled: overrideMusic,
				isSoundEnabled: overrideSound,
			} = overrides ?? {};
			const nextDarkMode = overrideDark ?? isDarkMode;
			const nextDevMode = overrideDev ?? isDevMode;
			const nextMusic = overrideMusic ?? isMusicEnabled;
			const nextSound = overrideSound ?? isSoundEnabled;

			return {
				screen: nextScreen,
				gameKey: nextGameKey,
				isDarkModeEnabled: nextDarkMode,
				isDevModeEnabled: nextDevMode,
				isMusicEnabled: nextMusic,
				isSoundEnabled: nextSound,
			};
		},
		[
			currentScreen,
			currentGameKey,
			isDarkMode,
			isDevMode,
			isMusicEnabled,
			isSoundEnabled,
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
		const {
			screen: historyScreen,
			gameKey: savedGameKey = 0,
			isDarkModeEnabled: savedDark = true,
			isDevModeEnabled: savedDev = false,
		} = historyState ?? {};

		const nextScreen = historyScreen ?? initialScreenFromPath;
		const derivedState: HistoryState = {
			screen: nextScreen,
			gameKey: savedGameKey,
			isDarkModeEnabled: savedDark,
			isDevModeEnabled: savedDev,
			isMusicEnabled: historyState?.isMusicEnabled ?? true,
			isSoundEnabled: historyState?.isSoundEnabled ?? true,
		};

		setCurrentScreen(nextScreen);
		setCurrentGameKey(savedGameKey);
		setIsDarkMode(savedDark);
		setIsDevMode(savedDev);
		setIsMusicEnabled(historyState?.isMusicEnabled ?? true);
		setIsSoundEnabled(historyState?.isSoundEnabled ?? true);

		const targetPath = SCREEN_PATHS[nextScreen];
		replaceHistoryState(derivedState, targetPath);
	}, [replaceHistoryState]);
	useEffect(() => {
		if (typeof window === 'undefined') {
			return;
		}
		const handlePopState = (event: PopStateEvent) => {
			const state = event.state as HistoryState | null;
			if (state?.screen) {
				setCurrentScreen(state.screen);
				setCurrentGameKey(state.gameKey ?? 0);
				setIsDarkMode(state.isDarkModeEnabled ?? true);
				setIsDevMode(state.isDevModeEnabled ?? false);
				setIsMusicEnabled(state.isMusicEnabled ?? true);
				setIsSoundEnabled(state.isSoundEnabled ?? true);
			} else {
				setCurrentScreen(Screen.Menu);
				setCurrentGameKey(0);
				setIsDarkMode(true);
				setIsDevMode(false);
				setIsMusicEnabled(true);
				setIsSoundEnabled(true);
			}
		};

		window.addEventListener('popstate', handlePopState);
		return () => {
			window.removeEventListener('popstate', handlePopState);
		};
	}, []);
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

	const toggleMusic = useCallback(() => {
		setIsMusicEnabled((previousValue) => {
			const nextValue = !previousValue;
			replaceHistoryState(
				buildHistoryState({
					isMusicEnabled: nextValue,
				}),
			);
			return nextValue;
		});
	}, [buildHistoryState, replaceHistoryState]);

	const toggleSound = useCallback(() => {
		setIsSoundEnabled((previousValue) => {
			const nextValue = !previousValue;
			replaceHistoryState(
				buildHistoryState({
					isSoundEnabled: nextValue,
				}),
			);
			return nextValue;
		});
	}, [buildHistoryState, replaceHistoryState]);

	return {
		currentScreen,
		currentGameKey,
		isDarkMode,
		isDevMode,
		isMusicEnabled,
		isSoundEnabled,
		startStandardGame,
		startDeveloperGame,
		openOverview,
		openTutorial,
		returnToMenu,
		toggleDarkMode,
		toggleMusic,
		toggleSound,
	};
}
