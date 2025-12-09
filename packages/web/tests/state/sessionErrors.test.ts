import { describe, expect, it } from 'vitest';
import { GameApiError } from '../../src/services/gameApi';
import {
	isSessionExpiredError,
	markSessionExpired,
	isMarkedSessionExpired,
	markFatalSessionError,
	isFatalSessionError,
} from '../../src/state/sessionErrors';

describe('sessionErrors', () => {
	describe('isSessionExpiredError', () => {
		it('returns true for GameApiError with 404 status and NOT_FOUND code', () => {
			const error = new GameApiError('Session not found', 404, 'Not Found', {
				code: 'NOT_FOUND',
				message: 'Session "abc" was not found.',
			});
			expect(isSessionExpiredError(error)).toBe(true);
		});

		it('returns false for GameApiError with 404 but different code', () => {
			const error = new GameApiError('Action not found', 404, 'Not Found', {
				code: 'ACTION_NOT_FOUND',
				message: 'Action was not found.',
			});
			expect(isSessionExpiredError(error)).toBe(false);
		});

		it('returns false for GameApiError with non-404 status', () => {
			const error = new GameApiError(
				'Server error',
				500,
				'Internal Server Error',
				{ code: 'NOT_FOUND', message: 'Something not found.' },
			);
			expect(isSessionExpiredError(error)).toBe(false);
		});

		it('returns false for non-GameApiError', () => {
			const error = new Error('Session not found');
			expect(isSessionExpiredError(error)).toBe(false);
		});

		it('returns false for null body', () => {
			const error = new GameApiError(
				'Session not found',
				404,
				'Not Found',
				null,
			);
			expect(isSessionExpiredError(error)).toBe(false);
		});

		it('returns false for non-object body', () => {
			const error = new GameApiError(
				'Session not found',
				404,
				'Not Found',
				'string body',
			);
			expect(isSessionExpiredError(error)).toBe(false);
		});
	});

	describe('markSessionExpired / isMarkedSessionExpired', () => {
		it('marks an error as session expired', () => {
			const error = new Error('test');
			expect(isMarkedSessionExpired(error)).toBe(false);

			markSessionExpired(error);

			expect(isMarkedSessionExpired(error)).toBe(true);
		});

		it('does not throw when marking null', () => {
			expect(() => markSessionExpired(null)).not.toThrow();
		});

		it('returns false for non-object values', () => {
			expect(isMarkedSessionExpired(null)).toBe(false);
			expect(isMarkedSessionExpired(undefined)).toBe(false);
			expect(isMarkedSessionExpired('string')).toBe(false);
			expect(isMarkedSessionExpired(123)).toBe(false);
		});

		it('does not conflict with fatal session error marking', () => {
			const error = new Error('test');

			markSessionExpired(error);
			expect(isMarkedSessionExpired(error)).toBe(true);
			expect(isFatalSessionError(error)).toBe(false);

			markFatalSessionError(error);
			expect(isMarkedSessionExpired(error)).toBe(true);
			expect(isFatalSessionError(error)).toBe(true);
		});
	});
});
