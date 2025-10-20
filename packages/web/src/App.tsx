import type { ReactNode } from 'react';
import Game from './Game';
import Menu from './Menu';
import Overview from './Overview';
import Tutorial from './Tutorial';
import BackgroundMusic from './components/audio/BackgroundMusic';
import { useAppNavigation } from './state/useAppNavigation';
import { usePlayerIdentity } from './state/playerIdentity';
import { Screen } from './state/appHistory';
import { RegistryMetadataProvider } from './contexts/RegistryMetadataContext';
import { getContentRegistrySnapshot } from './contexts/contentRegistrySnapshot';

const { registries: OVERVIEW_REGISTRIES, metadata: OVERVIEW_METADATA } =
	getContentRegistrySnapshot();

export default function App() {
	const {
		currentScreen,
		currentGameKey,
		isDarkMode,
		isDevMode,
		isMusicEnabled,
		isSoundEnabled,
		isBackgroundAudioMuted,
		isAutoAcknowledgeEnabled,
		isAutoPassEnabled,
		startStandardGame,
		startDeveloperGame,
		openOverview,
		openTutorial,
		returnToMenu,
		toggleDarkMode,
		toggleMusic,
		toggleSound,
		toggleBackgroundAudioMute,
		toggleAutoAcknowledge,
		toggleAutoPass,
	} = useAppNavigation();
	const { playerName, hasStoredName, setPlayerName } = usePlayerIdentity();

	let screen: ReactNode;
	switch (currentScreen) {
		case Screen.Overview:
			screen = (
				<RegistryMetadataProvider
					registries={OVERVIEW_REGISTRIES}
					metadata={OVERVIEW_METADATA}
				>
					<Overview onBack={returnToMenu} />
				</RegistryMetadataProvider>
			);
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
					backgroundAudioMuted={isBackgroundAudioMuted}
					onToggleBackgroundAudioMute={toggleBackgroundAudioMute}
					autoAcknowledgeEnabled={isAutoAcknowledgeEnabled}
					onToggleAutoAcknowledge={toggleAutoAcknowledge}
					autoPassEnabled={isAutoPassEnabled}
					onToggleAutoPass={toggleAutoPass}
					playerName={playerName}
					onChangePlayerName={setPlayerName}
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
					backgroundAudioMuted={isBackgroundAudioMuted}
					onToggleBackgroundAudioMute={toggleBackgroundAudioMute}
					autoAcknowledgeEnabled={isAutoAcknowledgeEnabled}
					onToggleAutoAcknowledge={toggleAutoAcknowledge}
					autoPassEnabled={isAutoPassEnabled}
					onToggleAutoPass={toggleAutoPass}
					playerName={playerName}
					onChangePlayerName={setPlayerName}
					hasStoredName={hasStoredName}
				/>
			);
			break;
	}

	return (
		<>
			<BackgroundMusic
				enabled={isMusicEnabled}
				muteWhenBackground={isBackgroundAudioMuted}
			/>
			{screen}
		</>
	);
}
