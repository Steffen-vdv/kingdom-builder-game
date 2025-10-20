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
	autoAcknowledgeEnabled?: boolean;
	onToggleAutoAcknowledge?: () => void;
	autoPassEnabled?: boolean;
	onToggleAutoPass?: () => void;
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
	autoAcknowledgeEnabled = false,
	onToggleAutoAcknowledge = () => {},
	autoPassEnabled = false,
	onToggleAutoPass = () => {},
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
			autoAcknowledgeEnabled={autoAcknowledgeEnabled}
			onToggleAutoAcknowledge={onToggleAutoAcknowledge}
			autoPassEnabled={autoPassEnabled}
			onToggleAutoPass={onToggleAutoPass}
			playerName={playerName}
			onChangePlayerName={onChangePlayerName}
		>
			<GameLayout />
		</GameProvider>
	);
}
