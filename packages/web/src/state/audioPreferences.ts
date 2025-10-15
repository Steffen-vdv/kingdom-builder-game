import { useCallback, useState } from 'react';

export const MUSIC_PREFERENCE_STORAGE_KEY =
	'kingdom-builder.preferences.musicEnabled';
export const SOUND_PREFERENCE_STORAGE_KEY =
	'kingdom-builder.preferences.soundEnabled';
export const BACKGROUND_AUDIO_MUTE_STORAGE_KEY =
	'kingdom-builder.preferences.backgroundAudioMuted';

type PreferenceUpdater = boolean | ((previousValue: boolean) => boolean);

function readBooleanPreference(key: string, defaultValue: boolean): boolean {
	if (typeof window === 'undefined') {
		return defaultValue;
	}

        try {
                const storedValue = window.localStorage.getItem(key);
                if (storedValue === null) {
                        return defaultValue;
                }

                return storedValue === 'true';
        } catch {
                return defaultValue;
        }
}

function writeBooleanPreference(key: string, value: boolean) {
	if (typeof window === 'undefined') {
		return;
	}

        try {
                window.localStorage.setItem(key, value ? 'true' : 'false');
        } catch {
                // Ignore storage exceptions (e.g., Safari private mode).
        }
}

function useStoredBooleanPreference(
	key: string,
	defaultValue: boolean,
): [boolean, (updater: PreferenceUpdater) => void] {
	const [value, setValue] = useState(() =>
		readBooleanPreference(key, defaultValue),
	);

	const updateValue = useCallback(
		(updater: PreferenceUpdater) => {
			setValue((previousValue) => {
				let nextValue: boolean;
				if (typeof updater === 'function') {
					const handler = updater as (previous: boolean) => boolean;
					nextValue = handler(previousValue);
				} else {
					nextValue = updater;
				}
				writeBooleanPreference(key, nextValue);
				return nextValue;
			});
		},
		[key],
	);

	return [value, updateValue];
}

export function getStoredAudioPreferences(): {
	music: boolean;
	sound: boolean;
	backgroundMute: boolean;
} {
	return {
		music: readBooleanPreference(MUSIC_PREFERENCE_STORAGE_KEY, true),
		sound: readBooleanPreference(SOUND_PREFERENCE_STORAGE_KEY, true),
		backgroundMute: readBooleanPreference(
			BACKGROUND_AUDIO_MUTE_STORAGE_KEY,
			true,
		),
	};
}

export function useAudioPreferences() {
	const [isMusicEnabled, setIsMusicEnabled] = useStoredBooleanPreference(
		MUSIC_PREFERENCE_STORAGE_KEY,
		true,
	);
	const [isSoundEnabled, setIsSoundEnabled] = useStoredBooleanPreference(
		SOUND_PREFERENCE_STORAGE_KEY,
		true,
	);
	const [isBackgroundAudioMuted, setIsBackgroundAudioMuted] =
		useStoredBooleanPreference(BACKGROUND_AUDIO_MUTE_STORAGE_KEY, true);

	return {
		isMusicEnabled,
		setIsMusicEnabled,
		isSoundEnabled,
		setIsSoundEnabled,
		isBackgroundAudioMuted,
		setIsBackgroundAudioMuted,
	} as const;
}
