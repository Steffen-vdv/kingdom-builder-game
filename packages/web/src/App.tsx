import { useState, useEffect, useCallback } from 'react';
import Game from './Game';
import Menu from './Menu';
import Overview from './Overview';
import Tutorial from './Tutorial';

enum Screen {
	Menu = 'menu',
	Overview = 'overview',
	Tutorial = 'tutorial',
	Game = 'game',
}

const SCREEN_PATHS: Record<Screen, string> = {
	[Screen.Menu]: '/',
	[Screen.Overview]: '/overview',
	[Screen.Tutorial]: '/tutorial',
	[Screen.Game]: '/game',
};

const getScreenFromPath = (pathname: string): Screen => {
	const normalizedPath = pathname.startsWith('/') ? pathname : `/${pathname}`;
	const screenEntry = Object.entries(SCREEN_PATHS).find(
		([, path]) => path === normalizedPath,
	);
	if (!screenEntry) {
		return Screen.Menu;
	}
	return screenEntry[0] as Screen;
};

interface HistoryState {
	screen: Screen;
	gameKey: number;
	isDarkModeEnabled: boolean;
	isDevModeEnabled: boolean;
}

export default function App() {
	const [currentScreen, setCurrentScreen] = useState<Screen>(Screen.Menu);
	const [currentGameKey, setCurrentGameKey] = useState(0);
	const [isDarkMode, setIsDarkMode] = useState(true);
	const [isDevMode, setIsDevMode] = useState(false);

	const buildHistoryState = useCallback(
		(overrides?: Partial<HistoryState>): HistoryState => {
			const {
				screen: nextScreen = currentScreen,
				gameKey: nextGameKey = currentGameKey,
				isDarkModeEnabled: overrideDark,
				isDevModeEnabled: overrideDev,
			} = overrides ?? {};
			const nextDarkMode = overrideDark ?? isDarkMode;
			const nextDevMode = overrideDev ?? isDevMode;

			return {
				screen: nextScreen,
				gameKey: nextGameKey,
				isDarkModeEnabled: nextDarkMode,
				isDevModeEnabled: nextDevMode,
			};
		},
		[currentScreen, currentGameKey, isDarkMode, isDevMode],
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
		};

		setCurrentScreen(nextScreen);
		setCurrentGameKey(savedGameKey);
		setIsDarkMode(savedDark);
		setIsDevMode(savedDev);

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
			} else {
				setCurrentScreen(Screen.Menu);
				setCurrentGameKey(0);
				setIsDarkMode(true);
				setIsDevMode(false);
			}
		};

		window.addEventListener('popstate', handlePopState);
		return () => {
			window.removeEventListener('popstate', handlePopState);
		};
	}, []);

	const returnToMenu = () => {
		const nextState = buildHistoryState({ screen: Screen.Menu });
		setCurrentScreen(Screen.Menu);
		pushHistoryState(nextState, SCREEN_PATHS[Screen.Menu]);
	};

	const toggleDarkMode = () => {
		setIsDarkMode((previousDarkMode) => {
			const nextDarkMode = !previousDarkMode;
			replaceHistoryState(
				buildHistoryState({
					isDarkModeEnabled: nextDarkMode,
				}),
			);
			return nextDarkMode;
		});
	};

	const startStandardGame = () => {
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
	};

	const startDeveloperGame = () => {
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
	};

	const openOverview = () => {
		setCurrentScreen(Screen.Overview);
		const overviewState = buildHistoryState({
			screen: Screen.Overview,
		});
		pushHistoryState(overviewState, SCREEN_PATHS[Screen.Overview]);
	};

	const openTutorial = () => {
		setCurrentScreen(Screen.Tutorial);
		const tutorialState = buildHistoryState({
			screen: Screen.Tutorial,
		});
		pushHistoryState(tutorialState, SCREEN_PATHS[Screen.Tutorial]);
	};

	switch (currentScreen) {
		case Screen.Overview:
			return <Overview onBack={returnToMenu} />;
		case Screen.Tutorial:
			return <Tutorial onBack={returnToMenu} />;
		case Screen.Game:
			return (
				<Game
					key={currentGameKey}
					onExit={returnToMenu}
					darkMode={isDarkMode}
					onToggleDark={toggleDarkMode}
					devMode={isDevMode}
				/>
			);
		case Screen.Menu:
		default:
			return (
				<Menu
					onStart={startStandardGame}
					onStartDev={startDeveloperGame}
					onOverview={openOverview}
					onTutorial={openTutorial}
				/>
			);
	}
}
