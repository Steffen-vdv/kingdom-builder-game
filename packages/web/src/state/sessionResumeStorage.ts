export const RESUME_SESSION_STORAGE_KEY = 'kingdom-builder/resume-session';

export interface ResumeSessionRecord {
	readonly sessionId: string;
	readonly turn: number;
	readonly updatedAt: number;
	readonly contentId?: string;
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
	const { sessionId, turn, updatedAt } = candidate;
	const numericTurn = Number(turn);
	const numericUpdatedAt =
		typeof updatedAt === 'string' ? Date.parse(updatedAt) : Number(updatedAt);

	if (typeof sessionId !== 'string') {
		return undefined;
	}

	if (!Number.isFinite(numericTurn)) {
		return undefined;
	}

	if (!Number.isFinite(numericUpdatedAt)) {
		return undefined;
	}

	const resolvedContentId =
		typeof candidate.contentId === 'string' ? candidate.contentId : undefined;

	return {
		sessionId,
		turn: numericTurn,
		updatedAt: numericUpdatedAt,
		...(resolvedContentId !== undefined
			? { contentId: resolvedContentId }
			: {}),
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
			updatedAt: Number(record.updatedAt),
			...(record.contentId !== undefined
				? { contentId: record.contentId }
				: {}),
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
