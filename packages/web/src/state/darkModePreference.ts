import {
	useCallback,
	useState,
	type Dispatch,
	type SetStateAction,
} from 'react';

export const DARK_MODE_PREFERENCE_STORAGE_KEY =
	'kingdom-builder.preferences.darkModeEnabled';

type PreferenceUpdater = boolean | ((previousValue: boolean) => boolean);

function getSystemDarkModePreference(): boolean {
	if (typeof window === 'undefined') {
		return true;
	}

	try {
		if (typeof window.matchMedia !== 'function') {
			return true;
		}

		return window.matchMedia('(prefers-color-scheme: dark)').matches;
	} catch (error: unknown) {
		void error;
		return true;
	}
}

function readDarkModePreference(): boolean {
	const defaultValue = getSystemDarkModePreference();

	if (typeof window === 'undefined') {
		return defaultValue;
	}

	try {
		const storedValue = window.localStorage.getItem(
			DARK_MODE_PREFERENCE_STORAGE_KEY,
		);

		if (storedValue === null) {
			return defaultValue;
		}

		return storedValue === 'true';
	} catch (error: unknown) {
		void error;
		return defaultValue;
	}
}

function writeDarkModePreference(value: boolean) {
	if (typeof window === 'undefined') {
		return;
	}

	try {
		window.localStorage.setItem(
			DARK_MODE_PREFERENCE_STORAGE_KEY,
			value ? 'true' : 'false',
		);
	} catch (error: unknown) {
		// Ignore storage exceptions (e.g., Safari private mode).
		void error;
	}
}

function useStoredDarkModePreference(): [
	boolean,
	Dispatch<SetStateAction<boolean>>,
] {
	const [value, setValue] = useState(readDarkModePreference);

	const updateValue = useCallback<Dispatch<SetStateAction<boolean>>>(
		(updater: PreferenceUpdater) => {
			setValue((previousValue) => {
				let nextValue: boolean;

				if (typeof updater === 'function') {
					const handler = updater as (previous: boolean) => boolean;
					nextValue = handler(previousValue);
				} else {
					nextValue = updater;
				}

				writeDarkModePreference(nextValue);
				return nextValue;
			});
		},
		[],
	);

	return [value, updateValue];
}

export function getStoredDarkModePreference(): boolean {
	return readDarkModePreference();
}

export function useDarkModePreference(): [
	boolean,
	Dispatch<SetStateAction<boolean>>,
] {
	return useStoredDarkModePreference();
}
