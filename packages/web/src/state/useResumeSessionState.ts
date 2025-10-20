import { useCallback, useState } from 'react';
import {
	clearStoredResumeSession,
	readStoredResumeSession,
	type ResumeSessionRecord,
	writeStoredResumeSession,
} from './sessionResumeStorage';

interface ResumeSessionStateResult {
	resumePoint: ResumeSessionRecord | null;
	resumeSessionId: string | null;
	updateFromHistory: (
		nextSessionId: string | null,
	) => ResumeSessionRecord | null;
	persistResumeSession: (
		record: ResumeSessionRecord,
		updateHistory: (nextSessionId: string | null) => void,
	) => void;
	clearResumeSession: (
		updateHistory: (nextSessionId: string | null) => void,
		sessionId?: string | null,
	) => void;
	handleResumeSessionFailure: (
		updateHistory: (nextSessionId: string | null) => void,
		options: { sessionId: string; error: unknown },
	) => void;
}

export const useResumeSessionState = (): ResumeSessionStateResult => {
	const [resumePoint, setResumePoint] = useState<ResumeSessionRecord | null>(
		() => {
			const stored = readStoredResumeSession();
			return stored ?? null;
		},
	);
	const [resumeSessionId, setResumeSessionId] = useState<string | null>(
		() => resumePoint?.sessionId ?? null,
	);

	const updateFromHistory = useCallback(
		(nextSessionId: string | null): ResumeSessionRecord | null => {
			if (!nextSessionId) {
				setResumePoint(null);
				setResumeSessionId(null);
				return null;
			}
			if (resumePoint?.sessionId === nextSessionId) {
				setResumeSessionId(nextSessionId);
				return resumePoint;
			}
			const storedRecord = readStoredResumeSession();
			if (storedRecord?.sessionId === nextSessionId) {
				setResumePoint(storedRecord);
				setResumeSessionId(storedRecord.sessionId);
				return storedRecord;
			}
			setResumePoint(null);
			setResumeSessionId(nextSessionId);
			return null;
		},
		[resumePoint],
	);

	const persistResumeSession = useCallback(
		(
			record: ResumeSessionRecord,
			updateHistory: (nextSessionId: string | null) => void,
		) => {
			setResumePoint(record);
			setResumeSessionId(record.sessionId);
			writeStoredResumeSession(record);
			updateHistory(record.sessionId);
		},
		[],
	);

	const clearResumeSession = useCallback(
		(
			updateHistory: (nextSessionId: string | null) => void,
			sessionId?: string | null,
		) => {
			if (
				typeof sessionId !== 'undefined' &&
				sessionId !== null &&
				sessionId !== resumeSessionId
			) {
				return;
			}
			setResumePoint(null);
			setResumeSessionId(null);
			clearStoredResumeSession();
			updateHistory(null);
		},
		[resumeSessionId],
	);

	const handleResumeSessionFailure = useCallback(
		(
			updateHistory: (nextSessionId: string | null) => void,
			options: { sessionId: string; error: unknown },
		) => {
			clearResumeSession(updateHistory, options.sessionId);
		},
		[clearResumeSession],
	);

	return {
		resumePoint,
		resumeSessionId,
		updateFromHistory,
		persistResumeSession,
		clearResumeSession,
		handleResumeSessionFailure,
	};
};
