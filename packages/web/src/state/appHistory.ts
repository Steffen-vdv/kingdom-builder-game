export enum Screen {
	Menu = 'menu',
	Overview = 'overview',
	Tutorial = 'tutorial',
	Game = 'game',
}

export interface HistoryState {
	screen: Screen;
	gameKey: number;
	isDarkModeEnabled: boolean;
	isDevModeEnabled: boolean;
	isMusicEnabled: boolean;
	isSoundEnabled: boolean;
	isBackgroundAudioMuted: boolean;
	isAutoAdvanceEnabled: boolean;
	resumeSessionId: string | null;
}
