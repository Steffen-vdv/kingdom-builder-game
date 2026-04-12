import { useCallback, useEffect, useState } from 'react';
import { Screen, type HistoryState } from './appHistory';
import {
	getStoredAudioPreferences,
	useAudioPreferences,
} from './audioPreferences';
import {
	getStoredGameplayPreferences,
	useGameplayPreferences,
} from './gameplayPreferences';
import type { AppNavigationState } from './appNavigationState';
import { useAudioPreferenceToggles } from './useAudioPreferenceToggles';
import { useGameplayPreferenceToggles } from './useGameplayPreferenceToggles';
import type { ResumeSessionRecord } from './sessionResumeStorage';
import { useResumeSessionState } from './useResumeSessionState';
import { useContinueSavedGame } from './useContinueSavedGame';
import {
	getStoredDarkModePreference,
	useDarkModePreference,
} from './darkModePreference';

const DEV_MODE_CONTENT_ID = 'kingdom-builder:dev-mode';

export function useAppNavigation(): AppNavigationState {
	const [currentScreen, setCurrentScreen] = useState<Screen>(Screen.Menu);
	const [currentGameKey, setCurrentGameKey] = useState(0);
	const [isDarkMode, setIsDarkMode] = useDarkModePreference();
	const [contentId, setContentId] = useState<string | null>(null);
	const [navigationState, setNavigationState] = useState<HistoryState | null>(
		null,
	);
	const [isInitialized, setIsInitialized] = useState(false);
	const {
		isMusicEnabled,
		setIsMusicEnabled,
		isSoundEnabled,
		setIsSoundEnabled,
		isBackgroundAudioMuted,
		setIsBackgroundAudioMuted,
	} = useAudioPreferences();
	const { isAutoAdvanceEnabled, setIsAutoAdvanceEnabled } =
		useGameplayPreferences();
	const {
		resumePoint,
		resumeSessionId,
		updateFromHistory,
		persistResumeSession: persistResumeSessionState,
		clearResumeSession: clearResumeSessionState,
		handleResumeSessionFailure: handleResumeSessionFailureState,
	} = useResumeSessionState();
	const pushHistoryState = useCallback(
		(nextState: HistoryState) => {
			setNavigationState(nextState);
		},
		[setNavigationState],
	);
	const replaceHistoryState = useCallback(
		(nextState: HistoryState) => {
			setNavigationState(nextState);
		},
		[setNavigationState],
	);
	const buildHistoryState = useCallback(
		(overrides?: Partial<HistoryState>): HistoryState => {
			const {
				screen: nextScreen = currentScreen,
				gameKey: nextGameKey = currentGameKey,
				contentId: overrideContentId,
				isDarkModeEnabled: overrideDark,
				isMusicEnabled: overrideMusic,
				isSoundEnabled: overrideSound,
				isBackgroundAudioMuted: overrideBackgroundMute,
				isAutoAdvanceEnabled: overrideAutoAdvance,
				resumeSessionId: overrideResumeSessionId,
			} = overrides ?? {};
			const nextDarkMode = overrideDark ?? isDarkMode;
			const nextContentId =
				overrideContentId !== undefined ? overrideContentId : contentId;
			const nextMusic = overrideMusic ?? isMusicEnabled;
			const nextSound = overrideSound ?? isSoundEnabled;
			const nextBackgroundMute =
				overrideBackgroundMute ?? isBackgroundAudioMuted;
			const nextAutoAdvance = overrideAutoAdvance ?? isAutoAdvanceEnabled;
			const nextResumeSessionId =
				overrideResumeSessionId !== undefined
					? overrideResumeSessionId
					: resumeSessionId;

			return {
				screen: nextScreen,
				gameKey: nextGameKey,
				contentId: nextContentId,
				isDarkModeEnabled: nextDarkMode,
				isMusicEnabled: nextMusic,
				isSoundEnabled: nextSound,
				isBackgroundAudioMuted: nextBackgroundMute,
				isAutoAdvanceEnabled: nextAutoAdvance,
				resumeSessionId: nextResumeSessionId ?? null,
			};
		},
		[
			currentScreen,
			currentGameKey,
			contentId,
			isDarkMode,
			isMusicEnabled,
			isSoundEnabled,
			isBackgroundAudioMuted,
			isAutoAdvanceEnabled,
			resumeSessionId,
		],
	);

	/**
	 * Migrate legacy history entries that stored
	 * `isDevModeEnabled` instead of `contentId`.
	 */
	function migrateHistoryState(
		state: HistoryState | null,
	): HistoryState | null {
		if (!state) {
			return null;
		}
		const legacy = state as HistoryState & {
			isDevModeEnabled?: boolean;
		};
		if (legacy.contentId === undefined && legacy.isDevModeEnabled != null) {
			return {
				...state,
				contentId: legacy.isDevModeEnabled ? DEV_MODE_CONTENT_ID : null,
			};
		}
		return state;
	}

	const applyHistoryState = useCallback(
		(rawState: HistoryState | null, fallbackScreen: Screen): HistoryState => {
			const state = migrateHistoryState(rawState);
			const { music, sound, backgroundMute } = getStoredAudioPreferences();
			const { autoAdvance } = getStoredGameplayPreferences();
			const darkMode = getStoredDarkModePreference();
			const nextResumeSessionId = state
				? state.resumeSessionId
				: resumeSessionId;
			updateFromHistory(nextResumeSessionId ?? null);
			const nextState: HistoryState = {
				screen: state?.screen ?? fallbackScreen,
				gameKey: state?.gameKey ?? 0,
				contentId: state?.contentId ?? null,
				isDarkModeEnabled: state?.isDarkModeEnabled ?? darkMode,
				isMusicEnabled: state?.isMusicEnabled ?? music,
				isSoundEnabled: state?.isSoundEnabled ?? sound,
				isBackgroundAudioMuted: state?.isBackgroundAudioMuted ?? backgroundMute,
				isAutoAdvanceEnabled: state?.isAutoAdvanceEnabled ?? autoAdvance,
				resumeSessionId: nextResumeSessionId ?? null,
			};

			setCurrentScreen(nextState.screen);
			setCurrentGameKey(nextState.gameKey);
			setIsDarkMode(nextState.isDarkModeEnabled);
			setContentId(nextState.contentId);
			setIsMusicEnabled(nextState.isMusicEnabled);
			setIsSoundEnabled(nextState.isSoundEnabled);
			setIsBackgroundAudioMuted(nextState.isBackgroundAudioMuted);
			setIsAutoAdvanceEnabled(nextState.isAutoAdvanceEnabled);

			return nextState;
		},
		[
			setCurrentScreen,
			setCurrentGameKey,
			setIsDarkMode,
			setContentId,
			setIsMusicEnabled,
			setIsSoundEnabled,
			setIsBackgroundAudioMuted,
			setIsAutoAdvanceEnabled,
			updateFromHistory,
			resumeSessionId,
		],
	);
	useEffect(() => {
		if (typeof document === 'undefined') {
			return;
		}
		document.documentElement.classList.toggle('dark', isDarkMode);
	}, [isDarkMode]);

	useEffect(() => {
		if (isInitialized) {
			return;
		}
		const nextState = applyHistoryState(navigationState, Screen.Menu);
		setNavigationState(nextState);
		setIsInitialized(true);
	}, [applyHistoryState, isInitialized, navigationState]);
	const returnToMenu = useCallback(() => {
		const nextState = buildHistoryState({
			screen: Screen.Menu,
		});
		setCurrentScreen(Screen.Menu);
		if (currentScreen === Screen.Menu) {
			replaceHistoryState(nextState);
			return;
		}
		pushHistoryState(nextState);
	}, [buildHistoryState, currentScreen, pushHistoryState, replaceHistoryState]);
	const toggleDarkMode = useCallback(() => {
		setIsDarkMode((previousDarkMode) => {
			const nextDarkMode = !previousDarkMode;
			replaceHistoryState(
				buildHistoryState({
					isDarkModeEnabled: nextDarkMode,
				}),
			);
			return nextDarkMode;
		});
	}, [buildHistoryState, replaceHistoryState]);

	const updateResumeHistory = useCallback(
		(nextSessionId: string | null) => {
			replaceHistoryState(
				buildHistoryState({
					resumeSessionId: nextSessionId,
				}),
			);
		},
		[buildHistoryState, replaceHistoryState],
	);
	const startGameWithContent = useCallback(
		(id: string) => {
			const nextGameKey = currentGameKey + 1;
			clearResumeSessionState(updateResumeHistory);
			const isDevContent = id === DEV_MODE_CONTENT_ID;
			setContentId(id);
			setCurrentGameKey(nextGameKey);
			setCurrentScreen(Screen.Game);
			pushHistoryState(
				buildHistoryState({
					screen: Screen.Game,
					gameKey: nextGameKey,
					contentId: id,
					isAutoAdvanceEnabled: isDevContent ? true : isAutoAdvanceEnabled,
					resumeSessionId: null,
				}),
			);
			if (isDevContent) {
				setIsAutoAdvanceEnabled(true);
			}
		},
		[
			buildHistoryState,
			clearResumeSessionState,
			currentGameKey,
			isAutoAdvanceEnabled,
			pushHistoryState,
			updateResumeHistory,
		],
	);

	const continueSavedGame = useContinueSavedGame({
		resumePoint,
		currentGameKey,
		setCurrentGameKey,
		setCurrentScreen,
		setContentId,
		buildHistoryState,
		pushHistoryState,
	});
	const persistResumeSession = useCallback(
		(record: ResumeSessionRecord) => {
			persistResumeSessionState(record, updateResumeHistory);
		},
		[persistResumeSessionState, updateResumeHistory],
	);
	const clearResumeSession = useCallback(
		(sessionId?: string | null) => {
			clearResumeSessionState(updateResumeHistory, sessionId);
		},
		[clearResumeSessionState, updateResumeHistory],
	);
	const handleResumeSessionFailure = useCallback(
		(options: { sessionId: string; error: unknown }) => {
			handleResumeSessionFailureState(updateResumeHistory, options);
		},
		[handleResumeSessionFailureState, updateResumeHistory],
	);

	const { toggleMusic, toggleSound, toggleBackgroundAudioMute } =
		useAudioPreferenceToggles(buildHistoryState, replaceHistoryState, {
			setIsMusicEnabled,
			setIsSoundEnabled,
			setIsBackgroundAudioMuted,
		});
	const { toggleAutoAdvance } = useGameplayPreferenceToggles(
		buildHistoryState,
		replaceHistoryState,
		{
			setIsAutoAdvanceEnabled,
		},
	);

	return {
		currentScreen,
		currentGameKey,
		isDarkMode,
		contentId,
		isMusicEnabled,
		isSoundEnabled,
		isBackgroundAudioMuted,
		isAutoAdvanceEnabled,
		resumePoint,
		resumeSessionId,
		startGameWithContent,
		continueSavedGame,
		returnToMenu,
		toggleDarkMode,
		toggleMusic,
		toggleSound,
		toggleBackgroundAudioMute,
		toggleAutoAdvance,
		persistResumeSession,
		clearResumeSession,
		handleResumeSessionFailure,
	};
}
