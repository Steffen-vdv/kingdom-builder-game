import { GameApiError } from '../services/gameApi';

export interface SessionFailureDetails {
	summary: string;
	details: string;
}

const DEFAULT_FAILURE_SUMMARY =
	'An unexpected error prevented the game from loading.';

const stringifyUnknown = (value: unknown): string => {
	if (value === undefined) {
		return 'undefined';
	}
	try {
		return JSON.stringify(value, null, 2);
	} catch {
		if (value === null) {
			return 'null';
		}
		if (typeof value === 'object') {
			const customToString = (
				value as {
					toString?: () => string;
				}
			).toString;
			if (
				typeof customToString === 'function' &&
				customToString !== Object.prototype.toString
			) {
				const result = customToString.call(value);
				if (typeof result === 'string' && result.trim().length > 0) {
					return result;
				}
			}
			return Object.prototype.toString.call(value);
		}
		if (typeof value === 'symbol') {
			return value.toString();
		}
		if (typeof value === 'string') {
			return value;
		}
		if (
			typeof value === 'number' ||
			typeof value === 'boolean' ||
			typeof value === 'bigint'
		) {
			return String(value);
		}
		return '[unserializable]';
	}
};

export const formatFailureDetails = (error: unknown): SessionFailureDetails => {
	if (error instanceof GameApiError) {
		return {
			summary: 'The game service returned an error response.',
			details: stringifyUnknown({
				name: error.name,
				message: error.message,
				status: error.status,
				statusText: error.statusText,
				body: error.body,
			}),
		};
	}
	if (error instanceof Error) {
		return {
			summary: DEFAULT_FAILURE_SUMMARY,
			details: stringifyUnknown({
				name: error.name,
				message: error.message,
				stack: error.stack,
			}),
		};
	}
	return {
		summary: DEFAULT_FAILURE_SUMMARY,
		details: stringifyUnknown({ value: error }),
	};
};
