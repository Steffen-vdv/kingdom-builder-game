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
	autoAcknowledgeResolutions?: boolean;
	onToggleAutoAcknowledgeResolutions?: () => void;
	autoPassTurn?: boolean;
	onToggleAutoPassTurn?: () => void;
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
	autoAcknowledgeResolutions = autoAcknowledgeEnabled,
	onToggleAutoAcknowledgeResolutions = onToggleAutoAcknowledge,
	autoPassTurn = autoPassEnabled,
	onToggleAutoPassTurn = onToggleAutoPass,
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
			autoAcknowledgeResolutions={autoAcknowledgeResolutions}
			onToggleAutoAcknowledgeResolutions={onToggleAutoAcknowledgeResolutions}
			autoPassTurn={autoPassTurn}
			onToggleAutoPassTurn={onToggleAutoPassTurn}
			playerName={playerName}
			onChangePlayerName={onChangePlayerName}
		>
			<GameLayout />
		</GameProvider>
	);
}
