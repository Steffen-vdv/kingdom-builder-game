import type {
	SessionActionRequirementList,
	SessionRequirementFailure,
} from '@kingdom-builder/protocol/session';
import { GameApiError } from '../services/gameApi';
import { getActionErrorMetadata } from './actionErrorMetadata';
import { SessionMirroringError } from './sessionErrors';

export interface SessionFailureDetails {
	summary: string;
	details: string;
}

const DEFAULT_FAILURE_SUMMARY =
	'An unexpected error prevented the game from loading.';

type ActionExecutionError = Error & {
	requirementFailure?: SessionRequirementFailure;
	requirementFailures?: SessionActionRequirementList;
	fatal?: boolean;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
	Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const serializeUnknown = (
	value: unknown,
	seen: WeakSet<object> = new WeakSet(),
): unknown => {
	if (value === undefined) {
		return 'undefined';
	}
	if (value === null) {
		return null;
	}
	if (typeof value === 'bigint') {
		return `${value}n`;
	}
	if (typeof value === 'symbol') {
		return value.toString();
	}
	if (typeof value === 'function') {
		return `[Function ${value.name || 'anonymous'}]`;
	}
	if (value instanceof Date) {
		return value.toISOString();
	}
	if (value instanceof Error) {
		return serializeError(value, seen);
	}
	if (Array.isArray(value)) {
		if (seen.has(value)) {
			return '[Circular Array]';
		}
		seen.add(value);
		return value.map((entry) => serializeUnknown(entry, seen));
	}
	if (isRecord(value)) {
		if (seen.has(value)) {
			return '[Circular Object]';
		}
		seen.add(value);
		const result: Record<string, unknown> = {};
		for (const [key, entry] of Object.entries(value)) {
			result[key] = serializeUnknown(entry, seen);
		}
		return result;
	}
	return value;
};

const serializeError = (error: Error, seen: WeakSet<object>): unknown => {
	const result: Record<string, unknown> = {
		name: error.name,
		message: error.message,
	};
	if (error.stack) {
		result.stack = error.stack;
	}
	const cause = error.cause;
	if (cause !== undefined) {
		result.cause = serializeUnknown(cause, seen);
	}
	const metadata = getActionErrorMetadata(error);
	if (metadata) {
		const { cause: _cause, ...rest } = metadata;
		if (Object.keys(rest).length > 0) {
			result.metadata = serializeUnknown(rest, seen);
		}
	}
	if (error instanceof GameApiError) {
		result.status = error.status;
		result.statusText = error.statusText;
		result.body = serializeUnknown(error.body, seen);
	}
	if (
		'fatal' in (error as ActionExecutionError) &&
		typeof (error as ActionExecutionError).fatal === 'boolean'
	) {
		result.fatal = (error as ActionExecutionError).fatal;
	}
	if ('requirementFailure' in (error as ActionExecutionError)) {
		const { requirementFailure } = error as ActionExecutionError;
		if (requirementFailure) {
			result.requirementFailure = serializeUnknown(requirementFailure, seen);
		}
	}
	if ('requirementFailures' in (error as ActionExecutionError)) {
		const { requirementFailures } = error as ActionExecutionError;
		if (requirementFailures) {
			result.requirementFailures = serializeUnknown(requirementFailures, seen);
		}
	}
	return result;
};

const stringifyUnknown = (value: unknown): string => {
	const serialized = serializeUnknown(value);
	try {
		return JSON.stringify(serialized, null, 2);
	} catch (error) {
		void error;
		if (typeof serialized === 'string') {
			return serialized;
		}
		return Object.prototype.toString.call(serialized);
	}
};

const isActionExecutionError = (
	value: unknown,
): value is ActionExecutionError =>
	value instanceof Error &&
	Boolean(
		(value as ActionExecutionError).requirementFailure ||
			(value as ActionExecutionError).requirementFailures ||
			getActionErrorMetadata(value),
	);

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
	if (error instanceof SessionMirroringError) {
		return {
			summary:
				'The client could not reconcile the game state from the service.',
			details: stringifyUnknown({
				error,
				details: error.details,
				cause: error.cause,
			}),
		};
	}
	if (isActionExecutionError(error)) {
		const metadata = getActionErrorMetadata(error);
		const { request, gameApi, context } = metadata ?? {};
		return {
			summary: 'Executing the last action caused a fatal error.',
			details: stringifyUnknown({
				error,
				action: request,
				gameApi,
				context,
			}),
		};
	}
	if (error instanceof Error) {
		return {
			summary: DEFAULT_FAILURE_SUMMARY,
			details: stringifyUnknown({ error }),
		};
	}
	return {
		summary: DEFAULT_FAILURE_SUMMARY,
		details: stringifyUnknown({ value: error }),
	};
};
