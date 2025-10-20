/** @vitest-environment jsdom */
import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useResumeSessionState } from '../../src/state/useResumeSessionState';
import {
	writeStoredResumeSession,
	clearStoredResumeSession,
	type ResumeSessionRecord,
} from '../../src/state/sessionResumeStorage';

describe('useResumeSessionState', () => {
	beforeEach(() => {
		window.localStorage.clear();
		clearStoredResumeSession();
	});

	it('keeps suspension active until a resume session is persisted', () => {
		const storedRecord: ResumeSessionRecord = {
			sessionId: 'stored-session',
			turn: 7,
			devMode: false,
			updatedAt: Date.UTC(2024, 0, 1),
		};
		writeStoredResumeSession(storedRecord);
		const { result } = renderHook(() => useResumeSessionState());

		expect(result.current.resumeSessionId).toBe(storedRecord.sessionId);
		expect(result.current.resumePoint).toEqual(storedRecord);

		act(() => {
			result.current.suspendResumeSession();
		});

		expect(result.current.resumeSessionId).toBeNull();

		act(() => {
			result.current.updateFromHistory(null);
		});

		expect(result.current.resumeSessionId).toBeNull();
		expect(result.current.resumePoint).toEqual(storedRecord);

		const historyUpdater = vi.fn();
		const nextRecord: ResumeSessionRecord = {
			sessionId: 'next-session',
			turn: 1,
			devMode: true,
			updatedAt: Date.UTC(2024, 0, 2),
		};

		act(() => {
			result.current.persistResumeSession(nextRecord, historyUpdater);
		});

		expect(historyUpdater).toHaveBeenCalledWith(nextRecord.sessionId);
		expect(result.current.resumeSessionId).toBe(nextRecord.sessionId);
		expect(result.current.resumePoint).toEqual(nextRecord);

		act(() => {
			result.current.updateFromHistory(nextRecord.sessionId);
		});

		expect(result.current.resumeSessionId).toBe(nextRecord.sessionId);
		expect(result.current.resumePoint).toEqual(nextRecord);
	});

	it('clears suspension when the resume session is explicitly cleared', () => {
		const storedRecord: ResumeSessionRecord = {
			sessionId: 'suspended-session',
			turn: 3,
			devMode: false,
			updatedAt: Date.UTC(2024, 0, 3),
		};
		writeStoredResumeSession(storedRecord);
		const historyUpdater = vi.fn();
		const { result } = renderHook(() => useResumeSessionState());

		act(() => {
			result.current.suspendResumeSession();
		});

		act(() => {
			result.current.updateFromHistory(null);
		});

		expect(result.current.resumeSessionId).toBeNull();
		expect(result.current.resumePoint).toEqual(storedRecord);

		act(() => {
			result.current.clearResumeSession(historyUpdater);
		});

		expect(historyUpdater).toHaveBeenCalledWith(null);
		expect(result.current.resumeSessionId).toBeNull();
		expect(result.current.resumePoint).toBeNull();

		const refreshedRecord: ResumeSessionRecord = {
			sessionId: 'refreshed-session',
			turn: 5,
			devMode: true,
			updatedAt: Date.UTC(2024, 0, 4),
		};
		writeStoredResumeSession(refreshedRecord);

		act(() => {
			result.current.updateFromHistory(refreshedRecord.sessionId);
		});

		expect(result.current.resumeSessionId).toBe(refreshedRecord.sessionId);
		expect(result.current.resumePoint).toEqual(refreshedRecord);
	});
});
