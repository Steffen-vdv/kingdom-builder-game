export const DARK_MODE_PREFERENCE_STORAGE_KEY =
	'kingdom-builder.preferences.darkModeEnabled';

function getSystemDarkModePreference(): boolean {
	if (typeof window === 'undefined') {
		return false;
	}

	try {
		if (typeof window.matchMedia !== 'function') {
			return false;
		}

		return window.matchMedia('(prefers-color-scheme: dark)').matches;
	} catch (error) {
		return false;
	}
}

export function getStoredDarkModePreference(): boolean {
	if (typeof window === 'undefined') {
		return getSystemDarkModePreference();
	}

	const defaultValue = getSystemDarkModePreference();

	try {
		const storedValue = window.localStorage.getItem(
			DARK_MODE_PREFERENCE_STORAGE_KEY,
		);
		if (storedValue === null) {
			return defaultValue;
		}

		return storedValue === 'true';
	} catch (error) {
		return defaultValue;
	}
}

export function setStoredDarkModePreference(value: boolean): void {
	if (typeof window === 'undefined') {
		return;
	}

	try {
		window.localStorage.setItem(
			DARK_MODE_PREFERENCE_STORAGE_KEY,
			value ? 'true' : 'false',
		);
	} catch (error) {
		// Ignore storage exceptions (e.g., Safari private mode).
	}
}
