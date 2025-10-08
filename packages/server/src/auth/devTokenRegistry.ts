import type { AuthContext } from './types.js';

const DEV_TOKEN_ENV_KEY = 'KB_SERVER_AUTH_TOKENS';
const DEV_TOKEN_HEADER = 'x-kb-dev-auth';

let cachedEnvValue: string | undefined;
let cachedRegistry: Map<string, AuthContext> | undefined;

function parseRegistry(value: string | undefined): Map<string, AuthContext> {
	if (!value) {
		return new Map();
	}
	try {
		const parsed = JSON.parse(value) as unknown;
		if (!parsed || typeof parsed !== 'object') {
			return new Map();
		}
		const entries = Object.entries(parsed as Record<string, unknown>);
		const registry = new Map<string, AuthContext>();
		for (const [token, rawConfig] of entries) {
			if (!token) {
				continue;
			}
			if (!rawConfig || typeof rawConfig !== 'object') {
				continue;
			}
			const { userId, roles } = rawConfig as {
				userId?: unknown;
				roles?: unknown;
			};
			if (typeof userId !== 'string' || userId.length === 0) {
				continue;
			}
			const normalizedRoles: string[] = Array.isArray(roles)
				? roles.filter((role): role is string => typeof role === 'string')
				: [];
			registry.set(token, {
				userId,
				roles: normalizedRoles,
				token,
			});
		}
		return registry;
	} catch {
		return new Map();
	}
}

function loadRegistry(): Map<string, AuthContext> {
	const currentValue = process.env[DEV_TOKEN_ENV_KEY];
	if (cachedRegistry && cachedEnvValue === currentValue) {
		return cachedRegistry;
	}
	cachedEnvValue = currentValue;
	cachedRegistry = parseRegistry(currentValue);
	return cachedRegistry;
}

export function getDevTokenAuth(
	token: string | undefined,
): AuthContext | undefined {
	if (!token) {
		return undefined;
	}
	const registry = loadRegistry();
	const context = registry.get(token);
	if (!context) {
		return undefined;
	}
	return { ...context };
}

export function getDevTokenHeaderName(): string {
	return DEV_TOKEN_HEADER;
}

export function getDevTokenEnvKey(): string {
	return DEV_TOKEN_ENV_KEY;
}
