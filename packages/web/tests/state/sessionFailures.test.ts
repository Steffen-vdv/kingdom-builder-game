import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GameApiError } from '../../src/services/gameApi';
import { formatFailureDetails } from '../../src/state/sessionFailures';
import * as sessionResumeStorage from '../../src/state/sessionResumeStorage';

vi.mock('../../src/state/sessionResumeStorage', () => ({
	clearStoredResumeSession: vi.fn(),
}));

describe('formatFailureDetails', () => {
	const mockClearStoredResumeSession = vi.mocked(
		sessionResumeStorage.clearStoredResumeSession,
	);

	beforeEach(() => {
		mockClearStoredResumeSession.mockReset();
	});

	it('clears stored resume session when session expiry error is detected', () => {
		const error = new GameApiError('Session not found', 404, 'Not Found', {
			code: 'NOT_FOUND',
			message: 'Session "abc-123" was not found.',
		});

		const result = formatFailureDetails(error);

		expect(mockClearStoredResumeSession).toHaveBeenCalledTimes(1);
		expect(result.retryLabel).toBe('Start New Game');
		expect(result.summary).toContain('session timed out');
	});

	it('does not clear stored resume session for other GameApiErrors', () => {
		const error = new GameApiError(
			'Server error',
			500,
			'Internal Server Error',
			{
				code: 'INTERNAL_ERROR',
				message: 'Something went wrong',
			},
		);

		formatFailureDetails(error);

		expect(mockClearStoredResumeSession).not.toHaveBeenCalled();
	});

	it('does not clear stored resume session for non-session 404 errors', () => {
		const error = new GameApiError('Action not found', 404, 'Not Found', {
			code: 'NOT_FOUND',
			message: 'Action "some-action" was not found in session "abc".',
		});

		formatFailureDetails(error);

		expect(mockClearStoredResumeSession).not.toHaveBeenCalled();
	});

	it('does not clear stored resume session for generic errors', () => {
		const error = new Error('Network failure');

		formatFailureDetails(error);

		expect(mockClearStoredResumeSession).not.toHaveBeenCalled();
	});
});
