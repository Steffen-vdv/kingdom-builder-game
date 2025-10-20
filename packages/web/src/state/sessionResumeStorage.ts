export const RESUME_SESSION_STORAGE_KEY = 'kingdom-builder/resume-session';

export interface ResumeSessionRecord {
	readonly sessionId: string;
	readonly turn: number;
	readonly devMode: boolean;
	readonly updatedAt: string;
}

const resolveStorage = (): Storage | undefined => {
	if (typeof window === 'undefined') {
		return undefined;
	}

	return window.localStorage;
};

const sanitizeParsedRecord = (
	value: unknown,
): ResumeSessionRecord | undefined => {
	if (typeof value !== 'object' || value === null) {
		return undefined;
	}

	const candidate = value as Partial<
		Record<keyof ResumeSessionRecord, unknown>
	>;
	const { sessionId, turn, devMode, updatedAt } = candidate;
	const numericTurn = Number(turn);

	if (typeof sessionId !== 'string') {
		return undefined;
	}

	if (typeof devMode !== 'boolean') {
		return undefined;
	}

	if (typeof updatedAt !== 'string') {
		return undefined;
	}

	if (!Number.isFinite(numericTurn)) {
		return undefined;
	}

	return {
		sessionId,
		turn: numericTurn,
		devMode,
		updatedAt,
	};
};

export const readStoredResumeSession = (): ResumeSessionRecord | undefined => {
	const storage = resolveStorage();

	if (!storage) {
		return undefined;
	}

	const raw = storage.getItem(RESUME_SESSION_STORAGE_KEY);

	if (!raw) {
		return undefined;
	}

	try {
		const parsed: unknown = JSON.parse(raw);
		const sanitized = sanitizeParsedRecord(parsed);

		if (!sanitized) {
			clearStoredResumeSession();
			return undefined;
		}

		return sanitized;
	} catch {
		clearStoredResumeSession();
		return undefined;
	}
};

export const writeStoredResumeSession = (record: ResumeSessionRecord): void => {
	const storage = resolveStorage();

	if (!storage) {
		return;
	}

	try {
		const payload = JSON.stringify({
			sessionId: record.sessionId,
			turn: Number(record.turn),
			devMode: record.devMode,
			updatedAt: record.updatedAt,
		});
		storage.setItem(RESUME_SESSION_STORAGE_KEY, payload);
	} catch {
		// Silently ignore storage write failures.
	}
};

export const clearStoredResumeSession = (): void => {
	const storage = resolveStorage();

	if (!storage) {
		return;
	}

	try {
		storage.removeItem(RESUME_SESSION_STORAGE_KEY);
	} catch {
		// Silently ignore storage removal failures.
	}
};
