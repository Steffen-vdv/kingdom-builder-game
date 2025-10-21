import { useCallback } from 'react';
import { Screen, type HistoryState } from './appHistory';
import type { ResumeSessionRecord } from './sessionResumeStorage';

interface ContinueSavedGameOptions {
	resumePoint: ResumeSessionRecord | null;
	currentGameKey: number;
	setCurrentGameKey: (value: number) => void;
	setCurrentScreen: (value: Screen) => void;
	setIsDevMode: (value: boolean) => void;
	buildHistoryState: (overrides?: Partial<HistoryState>) => HistoryState;
	pushHistoryState: (state: HistoryState) => void;
}

export const useContinueSavedGame = ({
	resumePoint,
	currentGameKey,
	setCurrentGameKey,
	setCurrentScreen,
	setIsDevMode,
	buildHistoryState,
	pushHistoryState,
}: ContinueSavedGameOptions) => {
	return useCallback(() => {
		if (!resumePoint) {
			return;
		}
		const nextGameKey = currentGameKey + 1;
		const nextDevMode = resumePoint.devMode;
		setIsDevMode(nextDevMode);
		setCurrentGameKey(nextGameKey);
		setCurrentScreen(Screen.Game);
		pushHistoryState(
			buildHistoryState({
				screen: Screen.Game,
				gameKey: nextGameKey,
				isDevModeEnabled: nextDevMode,
			}),
		);
	}, [
		buildHistoryState,
		currentGameKey,
		pushHistoryState,
		resumePoint,
		setCurrentGameKey,
		setCurrentScreen,
		setIsDevMode,
	]);
};
