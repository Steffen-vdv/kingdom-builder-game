/* @vitest-environment jsdom */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
	RESUME_SESSION_STORAGE_KEY,
	clearStoredResumeSession,
	readStoredResumeSession,
	writeStoredResumeSession,
} from '../../src/state/sessionResumeStorage';

describe('sessionResumeStorage', () => {
	beforeEach(() => {
		window.localStorage.clear();
	});

	afterEach(() => {
		window.localStorage.clear();
	});

	it('returns undefined when no record is stored', () => {
		const record = readStoredResumeSession();
		expect(record).toBeUndefined();
	});

	it('writes and reads a stored record preserving updatedAt', () => {
		const timestamp = Date.UTC(2024, 0, 1);
		const record = {
			sessionId: 'session-123',
			turn: 7,
			devMode: true,
			updatedAt: timestamp,
		};

		writeStoredResumeSession(record);
		const stored = readStoredResumeSession();

		expect(stored).toEqual(record);
	});

	it('clears the stored record', () => {
		window.localStorage.setItem(
			RESUME_SESSION_STORAGE_KEY,
			JSON.stringify({
				sessionId: 'session-123',
				turn: 1,
				devMode: false,
				updatedAt: Date.UTC(2024, 0, 1),
			}),
		);

		clearStoredResumeSession();

		expect(window.localStorage.getItem(RESUME_SESSION_STORAGE_KEY)).toBeNull();
	});

	it('recovers from invalid JSON payloads', () => {
		window.localStorage.setItem(RESUME_SESSION_STORAGE_KEY, 'not-valid-json');

		const record = readStoredResumeSession();

		expect(record).toBeUndefined();
		expect(window.localStorage.getItem(RESUME_SESSION_STORAGE_KEY)).toBeNull();
	});

	it('recovers from malformed records', () => {
		window.localStorage.setItem(
			RESUME_SESSION_STORAGE_KEY,
			JSON.stringify({
				sessionId: 42,
				turn: 3,
				devMode: true,
				updatedAt: '2024-01-01T00:00:00.000Z',
			}),
		);

		const record = readStoredResumeSession();

		expect(record).toBeUndefined();
		expect(window.localStorage.getItem(RESUME_SESSION_STORAGE_KEY)).toBeNull();
	});

	it('coerces stored turn values to numbers', () => {
		window.localStorage.setItem(
			RESUME_SESSION_STORAGE_KEY,
			JSON.stringify({
				sessionId: 'session-123',
				turn: '12',
				devMode: false,
				updatedAt: '2024-01-01T00:00:00.000Z',
			}),
		);

		const record = readStoredResumeSession();

		expect(record).toEqual({
			sessionId: 'session-123',
			turn: 12,
			devMode: false,
			updatedAt: Date.parse('2024-01-01T00:00:00.000Z'),
		});
	});

	it('clears records with non-numeric turn values', () => {
		window.localStorage.setItem(
			RESUME_SESSION_STORAGE_KEY,
			JSON.stringify({
				sessionId: 'session-123',
				turn: 'NaN',
				devMode: false,
				updatedAt: '2024-01-01T00:00:00.000Z',
			}),
		);

		const record = readStoredResumeSession();

		expect(record).toBeUndefined();
		expect(window.localStorage.getItem(RESUME_SESSION_STORAGE_KEY)).toBeNull();
	});
});
