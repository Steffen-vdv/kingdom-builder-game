import { useCallback, useState } from 'react';

export const AUTO_ADVANCE_PREFERENCE_STORAGE_KEY =
	'kingdom-builder.preferences.autoAdvance';

const LEGACY_AUTO_ACKNOWLEDGE_PREFERENCE_STORAGE_KEY =
	'kingdom-builder.preferences.autoAcknowledge';
const LEGACY_AUTO_PASS_PREFERENCE_STORAGE_KEY =
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

function readBooleanPreferenceOrNull(key: string): boolean | null {
	if (typeof window === 'undefined') {
		return null;
	}

	try {
		const storedValue = window.localStorage.getItem(key);
		if (storedValue === null) {
			return null;
		}

		return storedValue === 'true';
	} catch (error) {
		void error;
		return null;
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

function removePreference(key: string) {
	if (typeof window === 'undefined') {
		return;
	}

	try {
		window.localStorage.removeItem(key);
	} catch (error) {
		void error;
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
	autoAdvance: boolean;
} {
	const storedAutoAdvance = readBooleanPreferenceOrNull(
		AUTO_ADVANCE_PREFERENCE_STORAGE_KEY,
	);
	if (storedAutoAdvance !== null) {
		return { autoAdvance: storedAutoAdvance };
	}

	const legacyAutoAcknowledge = readBooleanPreference(
		LEGACY_AUTO_ACKNOWLEDGE_PREFERENCE_STORAGE_KEY,
		false,
	);
	const legacyAutoPass = readBooleanPreference(
		LEGACY_AUTO_PASS_PREFERENCE_STORAGE_KEY,
		false,
	);
	const legacyValue = legacyAutoAcknowledge || legacyAutoPass;
	if (legacyAutoAcknowledge || legacyAutoPass) {
		writeBooleanPreference(AUTO_ADVANCE_PREFERENCE_STORAGE_KEY, legacyValue);
	}
	removePreference(LEGACY_AUTO_ACKNOWLEDGE_PREFERENCE_STORAGE_KEY);
	removePreference(LEGACY_AUTO_PASS_PREFERENCE_STORAGE_KEY);
	return { autoAdvance: legacyValue };
}

export function useGameplayPreferences() {
	const storedPreferences = getStoredGameplayPreferences();
	const [isAutoAdvanceEnabled, setIsAutoAdvanceEnabled] =
		useStoredBooleanPreference(
			AUTO_ADVANCE_PREFERENCE_STORAGE_KEY,
			storedPreferences.autoAdvance,
		);

	return {
		isAutoAdvanceEnabled,
		setIsAutoAdvanceEnabled,
	} as const;
}
