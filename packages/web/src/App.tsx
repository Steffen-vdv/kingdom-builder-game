import Game from './Game';
import Menu from './Menu';
import Overview from './Overview';
import Tutorial from './Tutorial';
import BackgroundMusic from './components/audio/BackgroundMusic';
import { useAppNavigation } from './state/useAppNavigation';
import { Screen } from './state/appHistory';

export default function App() {
	const {
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
	} = useAppNavigation();

	let screen: JSX.Element;
	switch (currentScreen) {
		case Screen.Overview:
			screen = <Overview onBack={returnToMenu} />;
			break;
		case Screen.Tutorial:
			screen = <Tutorial onBack={returnToMenu} />;
			break;
		case Screen.Game:
			screen = (
				<Game
					key={currentGameKey}
					onExit={returnToMenu}
					darkMode={isDarkMode}
					onToggleDark={toggleDarkMode}
					devMode={isDevMode}
					musicEnabled={isMusicEnabled}
					onToggleMusic={toggleMusic}
					soundEnabled={isSoundEnabled}
					onToggleSound={toggleSound}
				/>
			);
			break;
		case Screen.Menu:
		default:
			screen = (
				<Menu
					onStart={startStandardGame}
					onStartDev={startDeveloperGame}
					onOverview={openOverview}
					onTutorial={openTutorial}
					darkModeEnabled={isDarkMode}
					onToggleDark={toggleDarkMode}
					musicEnabled={isMusicEnabled}
					onToggleMusic={toggleMusic}
					soundEnabled={isSoundEnabled}
					onToggleSound={toggleSound}
				/>
			);
			break;
	}

	return (
		<>
			<BackgroundMusic enabled={isMusicEnabled} />
			{screen}
		</>
	);
}
