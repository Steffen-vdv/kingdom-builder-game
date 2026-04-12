import { lazy, Suspense, type ReactNode } from 'react';
import Game from './Game';
import Menu from './Menu';
import BackgroundMusic from './components/audio/BackgroundMusic';
import { useAppNavigation } from './state/useAppNavigation';
import { usePlayerIdentity } from './state/playerIdentity';
import { Screen } from './state/appHistory';
import { SoundEffectsProvider } from './state/SoundEffectsContext';

const Playground = lazy(() => import('./playground/Playground'));

export default function App() {
	const {
		currentScreen,
		currentGameKey,
		isDarkMode,
		contentId,
		isMusicEnabled,
		isSoundEnabled,
		isBackgroundAudioMuted,
		isAutoAdvanceEnabled,
		resumePoint,
		resumeSessionId,
		startGameWithContent,
		continueSavedGame,
		returnToMenu,
		navigateToPlayground,
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
		case Screen.Game:
			screen = (
				<Game
					key={currentGameKey}
					onExit={returnToMenu}
					darkMode={isDarkMode}
					onToggleDark={toggleDarkMode}
					contentId={contentId ?? undefined}
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
		case Screen.Playground:
			screen = (
				<Suspense
					fallback={
						<div className="flex min-h-screen items-center justify-center">
							Loading...
						</div>
					}
				>
					<Playground onBack={returnToMenu} />
				</Suspense>
			);
			break;
		case Screen.Menu:
		default:
			screen = (
				<Menu
					onStartGame={startGameWithContent}
					onOpenPlayground={navigateToPlayground}
					resumePoint={resumePoint}
					onContinue={continueSavedGame}
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
