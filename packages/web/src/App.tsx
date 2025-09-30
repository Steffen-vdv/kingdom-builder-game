import React, { useState, useEffect } from 'react';
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

export default function App() {
	const [currentScreen, setCurrentScreen] = useState<Screen>(Screen.Menu);
	const [currentGameKey, setCurrentGameKey] = useState(0);
	const [isDarkModeEnabled, setIsDarkModeEnabled] = useState(true);
	const [isDevModeEnabled, setIsDevModeEnabled] = useState(false);

	useEffect(() => {
		document.documentElement.classList.toggle('dark', isDarkModeEnabled);
	}, [isDarkModeEnabled]);

	useEffect(() => {
		if (window.location.pathname !== '/') {
			window.history.replaceState(null, '', '/');
		}
	}, []);

	const returnToMenu = () => {
		setCurrentScreen(Screen.Menu);
	};

	const toggleDarkMode = () => {
		setIsDarkModeEnabled((previousDarkMode) => !previousDarkMode);
	};

	const incrementGameKey = () => {
		setCurrentGameKey((previousGameKey) => previousGameKey + 1);
	};

	const startStandardGame = () => {
		setIsDevModeEnabled(false);
		incrementGameKey();
		setCurrentScreen(Screen.Game);
	};

	const startDeveloperGame = () => {
		setIsDevModeEnabled(true);
		incrementGameKey();
		setCurrentScreen(Screen.Game);
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
