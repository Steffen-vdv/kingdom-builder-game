import { useCallback, useMemo } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type { HistoryState } from './appHistory';

type AudioHistoryKey =
	| 'isMusicEnabled'
	| 'isSoundEnabled'
	| 'isBackgroundAudioMuted';

interface PreferenceSetters {
	setIsMusicEnabled: Dispatch<SetStateAction<boolean>>;
	setIsSoundEnabled: Dispatch<SetStateAction<boolean>>;
	setIsBackgroundAudioMuted: Dispatch<SetStateAction<boolean>>;
}

type BuildHistoryState = (overrides?: Partial<HistoryState>) => HistoryState;
type ReplaceHistoryState = (nextState: HistoryState) => void;

export function useAudioPreferenceToggles(
	buildHistoryState: BuildHistoryState,
	replaceHistoryState: ReplaceHistoryState,
	{
		setIsMusicEnabled,
		setIsSoundEnabled,
		setIsBackgroundAudioMuted,
	}: PreferenceSetters,
) {
	const createPreferenceToggle = useCallback(
		(setter: Dispatch<SetStateAction<boolean>>, key: AudioHistoryKey) => {
			return () => {
				setter((previousValue) => {
					const nextValue = !previousValue;
					replaceHistoryState(
						buildHistoryState({
							[key]: nextValue,
						}),
					);
					return nextValue;
				});
			};
		},
		[buildHistoryState, replaceHistoryState],
	);

	const toggleMusic = useMemo(
		() => createPreferenceToggle(setIsMusicEnabled, 'isMusicEnabled'),
		[createPreferenceToggle, setIsMusicEnabled],
	);

	const toggleSound = useMemo(
		() => createPreferenceToggle(setIsSoundEnabled, 'isSoundEnabled'),
		[createPreferenceToggle, setIsSoundEnabled],
	);

	const toggleBackgroundAudioMute = useMemo(
		() =>
			createPreferenceToggle(
				setIsBackgroundAudioMuted,
				'isBackgroundAudioMuted',
			),
		[createPreferenceToggle, setIsBackgroundAudioMuted],
	);

	return { toggleMusic, toggleSound, toggleBackgroundAudioMute } as const;
}
