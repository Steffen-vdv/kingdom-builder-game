import { getDevTokenAuth, getDevTokenHeaderName } from './devTokenRegistry.js';
import type { AuthContext, RequestHeaders } from './types.js';

const AUTHORIZATION_HEADER = 'authorization';
const BEARER_PREFIX = 'bearer ';

function readHeader(
	headers: RequestHeaders | undefined,
	name: string,
): string | undefined {
	if (!headers) {
		return undefined;
	}
	const value = headers[name] ?? headers[name.toLowerCase()];
	if (Array.isArray(value)) {
		return value.find((entry) => typeof entry === 'string');
	}
	if (typeof value === 'string') {
		return value;
	}
	return undefined;
}

function extractBearerToken(value: string | undefined): string | undefined {
	if (!value) {
		return undefined;
	}
	const normalized = value.trim();
	if (normalized.length === 0) {
		return undefined;
	}
	if (!normalized.toLowerCase().startsWith(BEARER_PREFIX)) {
		return undefined;
	}
	return normalized.slice(BEARER_PREFIX.length).trim();
}

export function resolveAuthToken(
	headers: RequestHeaders | undefined,
): string | undefined {
	const bearer = extractBearerToken(readHeader(headers, AUTHORIZATION_HEADER));
	if (bearer) {
		return bearer;
	}
	const devHeader = readHeader(headers, getDevTokenHeaderName());
	if (devHeader) {
		return devHeader.trim();
	}
	return undefined;
}

export function validateAuth(
	headers: RequestHeaders | undefined,
): AuthContext | undefined {
	const token = resolveAuthToken(headers);
	return getDevTokenAuth(token);
}
