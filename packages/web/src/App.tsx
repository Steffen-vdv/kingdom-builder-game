import type { ReactNode } from 'react';
import Game from './Game';
import Menu from './Menu';
import Tutorial from './Tutorial';
import BackgroundMusic from './components/audio/BackgroundMusic';
import { useAppNavigation } from './state/useAppNavigation';
import { usePlayerIdentity } from './state/playerIdentity';
import { Screen } from './state/appHistory';
import { SoundEffectsProvider } from './state/SoundEffectsContext';

export default function App() {
	const {
		currentScreen,
		currentGameKey,
		isDarkMode,
		isDevMode,
		contentId,
		isMusicEnabled,
		isSoundEnabled,
		isBackgroundAudioMuted,
		isAutoAdvanceEnabled,
		resumePoint,
		resumeSessionId,
		startStandardGame,
		startDeveloperGame,
		continueSavedGame,
		openTutorial,
		returnToMenu,
		toggleDarkMode,
		toggleMusic,
		toggleSound,
		toggleBackgroundAudioMute,
		toggleAutoAdvance,
		persistResumeSession,
		clearResumeSession,
		handleResumeSessionFailure,
	} = useAppNavigation();
	const { playerName, hasStoredName, setPlayerName } = usePlayerIdentity();

	let screen: ReactNode;
	switch (currentScreen) {
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
					contentId={contentId}
					musicEnabled={isMusicEnabled}
					onToggleMusic={toggleMusic}
					soundEnabled={isSoundEnabled}
					onToggleSound={toggleSound}
					backgroundAudioMuted={isBackgroundAudioMuted}
					onToggleBackgroundAudioMute={toggleBackgroundAudioMute}
					autoAdvanceEnabled={isAutoAdvanceEnabled}
					onToggleAutoAdvance={toggleAutoAdvance}
					playerName={playerName}
					onChangePlayerName={setPlayerName}
					resumeSessionId={resumeSessionId}
					onPersistResumeSession={persistResumeSession}
					onClearResumeSession={clearResumeSession}
					onResumeSessionFailure={handleResumeSessionFailure}
				/>
			);
			break;
		case Screen.Menu:
		default:
			screen = (
				<Menu
					onStart={startStandardGame}
					onStartDev={startDeveloperGame}
					resumePoint={resumePoint}
					onContinue={continueSavedGame}
					onTutorial={openTutorial}
					darkModeEnabled={isDarkMode}
					onToggleDark={toggleDarkMode}
					musicEnabled={isMusicEnabled}
					onToggleMusic={toggleMusic}
					soundEnabled={isSoundEnabled}
					onToggleSound={toggleSound}
					backgroundAudioMuted={isBackgroundAudioMuted}
					onToggleBackgroundAudioMute={toggleBackgroundAudioMute}
					autoAdvanceEnabled={isAutoAdvanceEnabled}
					onToggleAutoAdvance={toggleAutoAdvance}
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
			<SoundEffectsProvider enabled={isSoundEnabled}>
				{screen}
			</SoundEffectsProvider>
		</>
	);
}
