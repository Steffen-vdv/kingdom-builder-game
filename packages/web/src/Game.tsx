import React from 'react';
import GameLayout from './GameLayout';
import { GameProvider } from './state/GameContext';

interface GameProps {
	onExit?: () => void;
	darkMode?: boolean;
	onToggleDark?: () => void;
	devMode?: boolean;
	musicEnabled?: boolean;
	onToggleMusic?: () => void;
	soundEnabled?: boolean;
	onToggleSound?: () => void;
	backgroundAudioMuted?: boolean;
	onToggleBackgroundAudioMute?: () => void;
	playerName: string;
	onChangePlayerName: (name: string) => void;
}

export default function Game({
	onExit,
	darkMode = true,
	onToggleDark = () => {},
	devMode = false,
	musicEnabled = true,
	onToggleMusic = () => {},
	soundEnabled = true,
	onToggleSound = () => {},
	backgroundAudioMuted = true,
	onToggleBackgroundAudioMute = () => {},
	playerName,
	onChangePlayerName,
}: GameProps) {
	return (
		<GameProvider
			{...(onExit ? { onExit } : {})}
			darkMode={darkMode}
			onToggleDark={onToggleDark}
			devMode={devMode}
			musicEnabled={musicEnabled}
			onToggleMusic={onToggleMusic}
			soundEnabled={soundEnabled}
			onToggleSound={onToggleSound}
			backgroundAudioMuted={backgroundAudioMuted}
			onToggleBackgroundAudioMute={onToggleBackgroundAudioMute}
			playerName={playerName}
			onChangePlayerName={onChangePlayerName}
		>
			<GameLayout />
		</GameProvider>
	);
}
