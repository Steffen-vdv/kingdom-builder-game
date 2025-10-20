/** @vitest-environment jsdom */
import { renderHook, act } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
	RESUME_SESSION_STORAGE_KEY,
	readStoredResumeSession,
	type ResumeSessionRecord,
	writeStoredResumeSession,
} from '../../src/state/sessionResumeStorage';
import { useResumeSessionState } from '../../src/state/useResumeSessionState';

describe('useResumeSessionState', () => {
	beforeEach(() => {
		window.localStorage.clear();
	});

	it('keeps resume data suspended until a new session is persisted', () => {
		const storedRecord: ResumeSessionRecord = {
			sessionId: 'stored-session',
			turn: 7,
			devMode: false,
			updatedAt: Date.UTC(2024, 0, 1),
		};
		writeStoredResumeSession(storedRecord);

		const { result } = renderHook(() => useResumeSessionState());

		expect(result.current.resumePoint).toEqual(storedRecord);
		expect(result.current.resumeSessionId).toBe(storedRecord.sessionId);

		act(() => {
			result.current.suspendResumeSession();
		});

		expect(result.current.resumePoint).toBeNull();
		expect(result.current.resumeSessionId).toBeNull();
		expect(window.localStorage.getItem(RESUME_SESSION_STORAGE_KEY)).toEqual(
			JSON.stringify(storedRecord),
		);

		act(() => {
			result.current.updateFromHistory(null);
		});

		expect(result.current.resumePoint).toBeNull();
		expect(result.current.resumeSessionId).toBeNull();

		const nextRecord: ResumeSessionRecord = {
			sessionId: 'new-session',
			turn: 1,
			devMode: true,
			updatedAt: Date.UTC(2024, 0, 2),
		};

		act(() => {
			result.current.persistResumeSession(nextRecord, vi.fn());
		});

		expect(result.current.resumePoint).toEqual(nextRecord);
		expect(result.current.resumeSessionId).toBe(nextRecord.sessionId);
		expect(readStoredResumeSession()).toEqual(nextRecord);

		act(() => {
			result.current.updateFromHistory(nextRecord.sessionId);
		});

		expect(result.current.resumePoint).toEqual(nextRecord);
		expect(result.current.resumeSessionId).toBe(nextRecord.sessionId);
	});
});
