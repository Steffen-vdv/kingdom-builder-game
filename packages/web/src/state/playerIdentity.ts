import { useCallback, useState } from 'react';

export const PLAYER_NAME_STORAGE_KEY = 'kingdom-builder.profile.playerName';
export const DEFAULT_PLAYER_NAME = 'Player';

type StoredName = string | null;

function sanitizeName(value: string): string {
	return value.trim().slice(0, 40);
}

function readStoredPlayerName(): StoredName {
	if (typeof window === 'undefined') {
		return null;
	}
	try {
		const raw = window.localStorage.getItem(PLAYER_NAME_STORAGE_KEY);
		if (!raw) {
			return null;
		}
		const trimmed = sanitizeName(raw);
		return trimmed.length > 0 ? trimmed : null;
	} catch (error) {
		return null;
	}
}

function writeStoredPlayerName(name: StoredName): void {
	if (typeof window === 'undefined') {
		return;
	}
	try {
		if (!name || name.length === 0) {
			window.localStorage.removeItem(PLAYER_NAME_STORAGE_KEY);
			return;
		}
		window.localStorage.setItem(PLAYER_NAME_STORAGE_KEY, name);
	} catch (error) {
		// Ignore storage exceptions (e.g., private browsing modes).
	}
}

export interface PlayerIdentityState {
	playerName: string;
	hasStoredName: boolean;
	setPlayerName: (name: string) => void;
	clearStoredName: () => void;
}

export function usePlayerIdentity(): PlayerIdentityState {
	const [storedName, setStoredName] = useState<StoredName>(() =>
		readStoredPlayerName(),
	);
	const updateName = useCallback((name: string) => {
		const sanitized = sanitizeName(name);
		if (sanitized.length === 0) {
			setStoredName(null);
			writeStoredPlayerName(null);
			return;
		}
		setStoredName(sanitized);
		writeStoredPlayerName(sanitized);
	}, []);
	const clearStoredName = useCallback(() => {
		setStoredName(null);
		writeStoredPlayerName(null);
	}, []);
	const playerName = storedName ?? DEFAULT_PLAYER_NAME;
	return {
		playerName,
		hasStoredName: storedName !== null,
		setPlayerName: updateName,
		clearStoredName,
	};
}

export { readStoredPlayerName };
