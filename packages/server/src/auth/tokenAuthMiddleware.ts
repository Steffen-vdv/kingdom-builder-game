import type { AuthContext, AuthRole } from './AuthContext.js';
import { AuthError } from './AuthError.js';

export interface AuthenticatedRequest<T = unknown> {
	headers?: Record<string, string | undefined>;
	auth?: AuthContext;
	body?: T;
}

export interface TokenDefinition {
	userId: string;
	roles?: AuthRole[];
}

export interface TokenAuthMiddlewareOptions {
	headerName?: string;
	altHeaderName?: string;
	env?: NodeJS.ProcessEnv;
	tokens?: Record<string, TokenDefinition>;
}

type TokenTable = Record<string, Required<TokenDefinition>>;

const DEFAULT_HEADER = 'authorization';
const DEFAULT_ALT_HEADER = 'x-kb-dev-token';
const DEFAULT_ENV_KEY = 'KB_SERVER_AUTH_TOKENS';

export type AuthMiddleware = (
	request: AuthenticatedRequest<unknown>,
) => AuthContext;

export function createTokenAuthMiddleware(
	options: TokenAuthMiddlewareOptions = {},
): AuthMiddleware {
	const tokens = buildTokenTable(options);
	return (request) => {
		const context = request.auth ?? resolveContext(request, tokens, options);
		request.auth = context;
		return context;
	};
}

function resolveContext(
	request: AuthenticatedRequest<unknown>,
	tokens: TokenTable,
	options: TokenAuthMiddlewareOptions,
): AuthContext {
	const headers = normalizeHeaders(request.headers);
	const token = readToken(headers, options);
	if (!token) {
		throw new AuthError('UNAUTHORIZED', 'Missing authentication token.');
	}
	const entry = tokens[token];
	if (!entry) {
		throw new AuthError(
			'FORBIDDEN',
			'Token is not authorized for this server.',
		);
	}
	return {
		userId: entry.userId,
		roles: [...entry.roles],
		token,
	};
}

function normalizeHeaders(
	headers: Record<string, string | undefined> | undefined,
): Record<string, string> {
	const normalized: Record<string, string> = {};
	if (!headers) {
		return normalized;
	}
	for (const [key, value] of Object.entries(headers)) {
		if (typeof value === 'string') {
			normalized[key.toLowerCase()] = value;
		}
	}
	return normalized;
}

function readToken(
	headers: Record<string, string>,
	options: TokenAuthMiddlewareOptions,
): string | undefined {
	const header = headers[(options.headerName ?? DEFAULT_HEADER).toLowerCase()];
	if (header) {
		const value = header.trim();
		if (value.toLowerCase().startsWith('bearer ')) {
			return value.slice(7).trim();
		}
		return value;
	}
	const altHeader =
		headers[(options.altHeaderName ?? DEFAULT_ALT_HEADER).toLowerCase()];
	if (altHeader) {
		return altHeader.trim();
	}
	return undefined;
}

function buildTokenTable(options: TokenAuthMiddlewareOptions): TokenTable {
	const tokens = options.tokens ?? readTokensFromEnv(options);
	const table: TokenTable = {};
	for (const [token, definition] of Object.entries(tokens)) {
		if (!definition.userId) {
			continue;
		}
		table[token] = {
			userId: definition.userId,
			roles: definition.roles ? [...definition.roles] : [],
		};
	}
	return table;
}

function readTokensFromEnv(
	options: TokenAuthMiddlewareOptions,
): Record<string, TokenDefinition> {
	const env = options.env ?? process.env;
	const raw = env[DEFAULT_ENV_KEY];
	if (!raw) {
		return {};
	}
	try {
		const parsed = JSON.parse(raw) as Record<string, TokenDefinition>;
		if (parsed && typeof parsed === 'object') {
			return parsed;
		}
	} catch (error) {
		throw new AuthError('FORBIDDEN', 'Invalid token configuration.');
	}
	return {};
}
