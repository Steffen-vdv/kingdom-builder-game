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

	const pushHistoryState = useCallback((nextState: HistoryState) => {
		if (typeof window === 'undefined') {
			return;
		}
		const { history, location } = window;
		history.pushState(nextState, '', location.pathname);
	}, []);

	const replaceHistoryState = useCallback((nextState: HistoryState) => {
		if (typeof window === 'undefined') {
			return;
		}
		const { history, location } = window;
		history.replaceState(nextState, '', location.pathname);
	}, []);

	useEffect(() => {
		document.documentElement.classList.toggle('dark', isDarkMode);
	}, [isDarkMode]);

	useEffect(() => {
		if (typeof window === 'undefined') {
			return;
		}
		const { history, location } = window;
		if (location.pathname !== '/') {
			history.replaceState(history.state, '', '/');
		}

		const historyState = history.state as HistoryState | null;
		const {
			screen: savedScreen = Screen.Menu,
			gameKey: savedGameKey = 0,
			isDarkModeEnabled: savedDark = true,
			isDevModeEnabled: savedDev = false,
		} = historyState ?? {};

		setCurrentScreen(savedScreen);
		setCurrentGameKey(savedGameKey);
		setIsDarkMode(savedDark);
		setIsDevMode(savedDev);

		replaceHistoryState({
			screen: savedScreen,
			gameKey: savedGameKey,
			isDarkModeEnabled: savedDark,
			isDevModeEnabled: savedDev,
		});
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
		pushHistoryState(nextState);
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
		);
	};

	const openOverview = () => {
		setCurrentScreen(Screen.Overview);
		const overviewState = buildHistoryState({
			screen: Screen.Overview,
		});
		pushHistoryState(overviewState);
	};

	const openTutorial = () => {
		setCurrentScreen(Screen.Tutorial);
		const tutorialState = buildHistoryState({
			screen: Screen.Tutorial,
		});
		pushHistoryState(tutorialState);
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
