import React, { useState, useEffect } from 'react';
import Game from './Game';
import Menu from './Menu';
import Overview from './Overview';
import Tutorial from './Tutorial';
import {
	clearSavedGame,
	loadSavedGame,
	loadSavedGameMeta,
	type SavedGame,
	type SavedGameMeta,
} from './state/persistence';

enum Screen {
	Menu = 'menu',
	Overview = 'overview',
	Tutorial = 'tutorial',
	Game = 'game',
}

export default function App() {
	const [currentScreen, setCurrentScreen] = useState<Screen>(Screen.Menu);
	const [currentGameKey, setCurrentGameKey] = useState(0);
	const [isDarkModeEnabled, setIsDarkModeEnabled] = useState(true);
	const [isDevModeEnabled, setIsDevModeEnabled] = useState(false);
	const [initialSave, setInitialSave] = useState<SavedGame | null>(null);
	const [savedGameMeta, setSavedGameMeta] = useState<SavedGameMeta | null>(
		() => {
			if (typeof window === 'undefined') {
				return null;
			}
			return loadSavedGameMeta();
		},
	);

	useEffect(() => {
		document.documentElement.classList.toggle('dark', isDarkModeEnabled);
	}, [isDarkModeEnabled]);

	useEffect(() => {
		if (window.location.pathname !== '/') {
			window.history.replaceState(null, '', '/');
		}
	}, []);

	const returnToMenu = () => {
		setInitialSave(null);
		if (typeof window !== 'undefined') {
			setSavedGameMeta(loadSavedGameMeta());
		} else {
			setSavedGameMeta(null);
		}
		setCurrentScreen(Screen.Menu);
	};

	const toggleDarkMode = () => {
		setIsDarkModeEnabled((previousDarkMode) => !previousDarkMode);
	};

	const incrementGameKey = () => {
		setCurrentGameKey((previousGameKey) => previousGameKey + 1);
	};

	const startStandardGame = () => {
		setInitialSave(null);
		setIsDevModeEnabled(false);
		incrementGameKey();
		setCurrentScreen(Screen.Game);
	};

	const startDeveloperGame = () => {
		setInitialSave(null);
		setIsDevModeEnabled(true);
		incrementGameKey();
		setCurrentScreen(Screen.Game);
	};

	const continueSavedGame = () => {
		if (typeof window === 'undefined') {
			return;
		}
		const save = loadSavedGame();
		if (!save) {
			setSavedGameMeta(null);
			return;
		}
		setInitialSave(save);
		setIsDevModeEnabled(save.devMode);
		setSavedGameMeta(loadSavedGameMeta());
		incrementGameKey();
		setCurrentScreen(Screen.Game);
	};

	const discardSavedGame = () => {
		if (typeof window === 'undefined') {
			return;
		}
		clearSavedGame();
		setSavedGameMeta(null);
		setInitialSave(null);
	};

	const openOverview = () => {
		setCurrentScreen(Screen.Overview);
	};

	const openTutorial = () => {
		setCurrentScreen(Screen.Tutorial);
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
					darkMode={isDarkModeEnabled}
					onToggleDark={toggleDarkMode}
					devMode={isDevModeEnabled}
					initialSave={initialSave}
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
					onContinue={continueSavedGame}
					savedGameMeta={savedGameMeta}
					onDiscardSave={discardSavedGame}
				/>
			);
	}
}
