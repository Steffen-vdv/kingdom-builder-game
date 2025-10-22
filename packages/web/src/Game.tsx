import React from 'react';
import GameLayout from './GameLayout';
import { GameProvider } from './state/GameContext';
import type { ResumeSessionRecord } from './state/sessionResumeStorage';
import type { ResumeSessionFailureOptions } from './state/GameContext.types';

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
	autoAdvanceEnabled?: boolean;
	onToggleAutoAdvance?: () => void;
	playerName: string;
	onChangePlayerName: (name: string) => void;
	resumeSessionId?: string | null;
	onPersistResumeSession?: (record: ResumeSessionRecord) => void;
	onClearResumeSession?: (sessionId?: string | null) => void;
	onResumeSessionFailure?: (options: ResumeSessionFailureOptions) => void;
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
	autoAdvanceEnabled = false,
	onToggleAutoAdvance = () => {},
	playerName,
	onChangePlayerName,
	resumeSessionId = null,
	onPersistResumeSession = () => {},
	onClearResumeSession = () => {},
	onResumeSessionFailure = () => {},
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
			autoAdvanceEnabled={autoAdvanceEnabled}
			onToggleAutoAdvance={onToggleAutoAdvance}
			playerName={playerName}
			onChangePlayerName={onChangePlayerName}
			resumeSessionId={resumeSessionId}
			onPersistResumeSession={onPersistResumeSession}
			onClearResumeSession={onClearResumeSession}
			onResumeSessionFailure={onResumeSessionFailure}
		>
			<GameLayout />
		</GameProvider>
	);
}
