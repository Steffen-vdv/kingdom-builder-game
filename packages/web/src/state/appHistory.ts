export enum Screen {
	Menu = 'menu',
	Overview = 'overview',
	Tutorial = 'tutorial',
	Game = 'game',
}

export const SCREEN_PATHS: Record<Screen, string> = {
	[Screen.Menu]: '/',
	[Screen.Overview]: '/overview',
	[Screen.Tutorial]: '/tutorial',
	[Screen.Game]: '/game',
};

export const getScreenFromPath = (pathname: string): Screen => {
	const normalizedPath = pathname.startsWith('/') ? pathname : `/${pathname}`;
	const screenEntry = Object.entries(SCREEN_PATHS).find(
		([, path]) => path === normalizedPath,
	);
	if (!screenEntry) {
		return Screen.Menu;
	}
	return screenEntry[0] as Screen;
};

export interface HistoryState {
	screen: Screen;
	gameKey: number;
	isDarkModeEnabled: boolean;
	isDevModeEnabled: boolean;
	isMusicEnabled: boolean;
	isSoundEnabled: boolean;
}
