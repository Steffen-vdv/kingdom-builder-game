/* @vitest-environment jsdom */
import { renderHook, act } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useResumeSessionState } from '../../src/state/useResumeSessionState';
import {
	readStoredResumeSession,
	writeStoredResumeSession,
	type ResumeSessionRecord,
} from '../../src/state/sessionResumeStorage';

describe('useResumeSessionState', () => {
	const baseRecord: ResumeSessionRecord = {
		sessionId: 'resume-session',
		turn: 7,
		devMode: false,
		updatedAt: Date.UTC(2024, 0, 1),
	};

	beforeEach(() => {
		window.localStorage.clear();
	});

	it('suspends stored resume sessions until a new record is persisted', () => {
		writeStoredResumeSession(baseRecord);
		const { result } = renderHook(() => useResumeSessionState());

		expect(result.current.resumePoint).toEqual(baseRecord);
		expect(result.current.resumeSessionId).toBe(baseRecord.sessionId);

		act(() => {
			result.current.suspendResumeSession();
		});

		expect(result.current.resumePoint).toBeNull();
		expect(result.current.resumeSessionId).toBeNull();
		expect(readStoredResumeSession()).toEqual(baseRecord);

		act(() => {
			result.current.updateFromHistory(baseRecord.sessionId);
		});

		expect(result.current.resumePoint).toBeNull();
		expect(result.current.resumeSessionId).toBeNull();

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
		const updateHistory = vi.fn();

		act(() => {
			result.current.persistResumeSession(nextRecord, updateHistory);
		});

		expect(result.current.resumePoint).toEqual(nextRecord);
		expect(result.current.resumeSessionId).toBe(nextRecord.sessionId);
		expect(updateHistory).toHaveBeenCalledWith(nextRecord.sessionId);
		expect(readStoredResumeSession()).toEqual(nextRecord);

		act(() => {
			result.current.updateFromHistory(nextRecord.sessionId);
		});

		expect(result.current.resumePoint).toEqual(nextRecord);
		expect(result.current.resumeSessionId).toBe(nextRecord.sessionId);
	});
});
