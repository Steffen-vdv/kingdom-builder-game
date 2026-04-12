import { useCallback } from 'react';
import { Screen, type HistoryState } from './appHistory';
import type { ResumeSessionRecord } from './sessionResumeStorage';

const DEV_MODE_CONTENT_ID = 'kingdom-builder:dev-mode';

interface ContinueSavedGameOptions {
	resumePoint: ResumeSessionRecord | null;
	currentGameKey: number;
	setCurrentGameKey: (value: number) => void;
	setCurrentScreen: (value: Screen) => void;
	setContentId: (value: string | null) => void;
	buildHistoryState: (overrides?: Partial<HistoryState>) => HistoryState;
	pushHistoryState: (state: HistoryState) => void;
}

export const useContinueSavedGame = ({
	resumePoint,
	currentGameKey,
	setCurrentGameKey,
	setCurrentScreen,
	setContentId,
	buildHistoryState,
	pushHistoryState,
}: ContinueSavedGameOptions) => {
	return useCallback(() => {
		if (!resumePoint) {
			return;
		}
		const nextGameKey = currentGameKey + 1;
		const nextContentId =
			resumePoint.contentId ??
			(resumePoint.devMode ? DEV_MODE_CONTENT_ID : null);
		setContentId(nextContentId);
		setCurrentGameKey(nextGameKey);
		setCurrentScreen(Screen.Game);
		pushHistoryState(
			buildHistoryState({
				screen: Screen.Game,
				gameKey: nextGameKey,
				contentId: nextContentId,
			}),
		);
	}, [
		buildHistoryState,
		currentGameKey,
		pushHistoryState,
		resumePoint,
		setContentId,
		setCurrentGameKey,
		setCurrentScreen,
	]);
};
