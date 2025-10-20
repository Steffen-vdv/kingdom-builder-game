import { useCallback, useState } from 'react';

export const AUTO_ACKNOWLEDGE_PREFERENCE_STORAGE_KEY =
	'kingdom-builder.preferences.autoAcknowledge';
export const AUTO_PASS_PREFERENCE_STORAGE_KEY =
	'kingdom-builder.preferences.autoPass';

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
	} catch (error) {
		void error;
		return defaultValue;
	}
}

function writeBooleanPreference(key: string, value: boolean) {
	if (typeof window === 'undefined') {
		return;
	}

	try {
		window.localStorage.setItem(key, value ? 'true' : 'false');
	} catch (error) {
		void error;
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

export function getStoredGameplayPreferences(): {
	autoAcknowledge: boolean;
	autoPass: boolean;
} {
	return {
		autoAcknowledge: readBooleanPreference(
			AUTO_ACKNOWLEDGE_PREFERENCE_STORAGE_KEY,
			false,
		),
		autoPass: readBooleanPreference(AUTO_PASS_PREFERENCE_STORAGE_KEY, false),
	};
}

export function useGameplayPreferences() {
	const [isAutoAcknowledgeEnabled, setIsAutoAcknowledgeEnabled] =
		useStoredBooleanPreference(AUTO_ACKNOWLEDGE_PREFERENCE_STORAGE_KEY, false);
	const [isAutoPassEnabled, setIsAutoPassEnabled] = useStoredBooleanPreference(
		AUTO_PASS_PREFERENCE_STORAGE_KEY,
		false,
	);

	return {
		isAutoAcknowledgeEnabled,
		setIsAutoAcknowledgeEnabled,
		isAutoPassEnabled,
		setIsAutoPassEnabled,
	} as const;
}
