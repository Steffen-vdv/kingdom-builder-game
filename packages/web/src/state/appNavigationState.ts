import type { Screen } from './appHistory';
import type { ResumeSessionRecord } from './sessionResumeStorage';

export interface AppNavigationState {
	currentScreen: Screen;
	currentGameKey: number;
	isDarkMode: boolean;
	isDevMode: boolean;
	isMusicEnabled: boolean;
	isSoundEnabled: boolean;
	isBackgroundAudioMuted: boolean;
	isAutoAcknowledgeEnabled: boolean;
	isAutoPassEnabled: boolean;
	resumePoint: ResumeSessionRecord | null;
	resumeSessionId: string | null;
	startStandardGame: () => void;
	startDeveloperGame: () => void;
	continueSavedGame: () => void;
	openOverview: () => void;
	openTutorial: () => void;
	returnToMenu: () => void;
	toggleDarkMode: () => void;
	toggleMusic: () => void;
	toggleSound: () => void;
	toggleBackgroundAudioMute: () => void;
	toggleAutoAcknowledge: () => void;
	toggleAutoPass: () => void;
	persistResumeSession: (record: ResumeSessionRecord) => void;
	clearResumeSession: (sessionId?: string | null) => void;
	handleResumeSessionFailure: (options: {
		sessionId: string;
		error: unknown;
	}) => void;
}
