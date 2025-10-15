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
	if (value === null) {
		return 'null';
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
	if (typeof value === 'symbol') {
		return value.toString();
	}
	if (typeof value === 'function') {
		return value.name ? `[Function ${value.name}]` : '[Function anonymous]';
	}
	try {
		return JSON.stringify(value, null, 2);
	} catch {
		const constructorName =
			(value as { constructor?: { name?: string } })?.constructor?.name ??
			'Object';
		const keys = Object.keys(value as Record<string, unknown>);
		if (keys.length === 0) {
			return `${constructorName} { }`;
		}
		const previewKeys = keys.slice(0, 5).join(', ');
		const suffix = keys.length > 5 ? ', …' : '';
		return `${constructorName} { ${previewKeys}${suffix} }`;
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
