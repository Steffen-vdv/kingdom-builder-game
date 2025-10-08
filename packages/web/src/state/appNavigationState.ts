import type { Screen } from './appHistory';

export interface AppNavigationState {
	currentScreen: Screen;
	currentGameKey: number;
	isDarkMode: boolean;
	isDevMode: boolean;
	isMusicEnabled: boolean;
	isSoundEnabled: boolean;
	isBackgroundAudioMuted: boolean;
	startStandardGame: () => void;
	startDeveloperGame: () => void;
	openOverview: () => void;
	openTutorial: () => void;
	returnToMenu: () => void;
	toggleDarkMode: () => void;
	toggleMusic: () => void;
	toggleSound: () => void;
	toggleBackgroundAudioMute: () => void;
}
