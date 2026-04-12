export enum Screen {
	Menu = 'menu',
	Game = 'game',
}

export interface HistoryState {
	screen: Screen;
	gameKey: number;
	contentId: string | null;
	isDarkModeEnabled: boolean;
	isMusicEnabled: boolean;
	isSoundEnabled: boolean;
	isBackgroundAudioMuted: boolean;
	isAutoAdvanceEnabled: boolean;
	resumeSessionId: string | null;
}
