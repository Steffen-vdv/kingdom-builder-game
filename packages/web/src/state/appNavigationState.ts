import type { Screen } from './appHistory';
import type { ResumeSessionRecord } from './sessionResumeStorage';

export interface AppNavigationState {
	currentScreen: Screen;
	currentGameKey: number;
	isDarkMode: boolean;
	contentId: string | null;
	isMusicEnabled: boolean;
	isSoundEnabled: boolean;
	isBackgroundAudioMuted: boolean;
	isAutoAdvanceEnabled: boolean;
	resumePoint: ResumeSessionRecord | null;
	resumeSessionId: string | null;
	startGameWithContent: (contentId: string) => void;
	continueSavedGame: () => void;
	returnToMenu: () => void;
	navigateToPlayground: () => void;
	toggleDarkMode: () => void;
	toggleMusic: () => void;
	toggleSound: () => void;
	toggleBackgroundAudioMute: () => void;
	toggleAutoAdvance: () => void;
	persistResumeSession: (record: ResumeSessionRecord) => void;
	clearResumeSession: (sessionId?: string | null) => void;
	handleResumeSessionFailure: (options: {
		sessionId: string;
		error: unknown;
	}) => void;
}
