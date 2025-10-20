import type { ReactNode } from 'react';
import Game from './Game';
import Menu from './Menu';
import Overview from './Overview';
import Tutorial from './Tutorial';
import BackgroundMusic from './components/audio/BackgroundMusic';
import BlockingScreen from './components/common/BlockingScreen';
import Button from './components/common/Button';
import { useAppNavigation } from './state/useAppNavigation';
import { usePlayerIdentity } from './state/playerIdentity';
import { Screen } from './state/appHistory';
import { RegistryMetadataProvider } from './contexts/RegistryMetadataContext';
import { useOverviewMetadata } from './state/useOverviewMetadata';

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
	const overviewMetadataState = useOverviewMetadata(
		currentScreen === Screen.Overview,
	);

	let screen: ReactNode;
	switch (currentScreen) {
		case Screen.Overview:
			if (overviewMetadataState.error) {
				screen = (
					<BlockingScreen
						title="We could not load the overview."
						description="Try again in a moment."
					>
						<p className="max-w-xl text-sm text-slate-600 dark:text-slate-300">
							{overviewMetadataState.error.message}
						</p>
						<div className="flex flex-wrap items-center justify-center gap-4">
							<Button
								onClick={overviewMetadataState.retry}
								variant="primary"
								icon="↻"
							>
								Try again
							</Button>
							<Button onClick={returnToMenu} variant="secondary" icon="🏠">
								Return to menu
							</Button>
						</div>
					</BlockingScreen>
				);
				break;
			}
			if (
				overviewMetadataState.isLoading ||
				!overviewMetadataState.registries ||
				!overviewMetadataState.metadata
			) {
				screen = (
					<BlockingScreen
						title="Preparing your kingdom..."
						description="Loading overview details."
					>
						<p className="text-sm text-slate-600 dark:text-slate-300">
							This will only take a few moments.
						</p>
					</BlockingScreen>
				);
				break;
			}
			screen = (
				<RegistryMetadataProvider
					registries={overviewMetadataState.registries}
					metadata={overviewMetadataState.metadata}
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
