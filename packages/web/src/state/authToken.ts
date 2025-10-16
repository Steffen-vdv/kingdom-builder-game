const AUTH_TOKEN_STORAGE_KEY = 'kingdom-builder.auth.token';
const DEFAULT_DEV_TOKEN = 'local-dev';

type AuthTokenValue = string | null | undefined;
type AuthTokenProviderFn = () => AuthTokenValue | Promise<AuthTokenValue>;
type AuthTokenCandidate = AuthTokenValue | AuthTokenProviderFn;

declare global {
	var __KINGDOM_BUILDER_AUTH_TOKEN__: AuthTokenCandidate | undefined;
	interface Window {
		__KINGDOM_BUILDER_AUTH_TOKEN__?: AuthTokenCandidate;
	}
}

const normalizeToken = (value: AuthTokenValue): string | null => {
	if (typeof value !== 'string') {
		return null;
	}
	const trimmed = value.trim();
	return trimmed.length > 0 ? trimmed : null;
};

const isAuthTokenProvider = (
	value: AuthTokenCandidate,
): value is AuthTokenProviderFn => typeof value === 'function';

const readStoredToken = (): string | null => {
	if (typeof window === 'undefined') {
		return null;
	}
	try {
		const storage = window.localStorage;
		const raw = storage?.getItem(AUTH_TOKEN_STORAGE_KEY);
		return normalizeToken(raw);
	} catch (error) {
		void error;
		return null;
	}
};

const resolveCandidate = async (
	candidate: AuthTokenCandidate | undefined,
): Promise<string | null> => {
	if (candidate === undefined || candidate === null) {
		return null;
	}
	if (isAuthTokenProvider(candidate)) {
		try {
			const resolved = await candidate();
			return normalizeToken(resolved);
		} catch (error) {
			void error;
			return null;
		}
	}
	return normalizeToken(candidate);
};

const readGlobalToken = async (): Promise<string | null> => {
	return resolveCandidate(globalThis.__KINGDOM_BUILDER_AUTH_TOKEN__);
};

const isDevelopmentEnvironment = (): boolean => {
	const processEnv =
		typeof process !== 'undefined' ? process.env?.NODE_ENV : undefined;
	if (typeof processEnv === 'string' && processEnv.trim().length > 0) {
		return processEnv.trim().toLowerCase() !== 'production';
	}
	const importMeta = ((): { env?: { DEV?: boolean; PROD?: boolean } } => {
		try {
			return (
				(import.meta as {
					env?: { DEV?: boolean; PROD?: boolean };
				}) ?? {}
			);
		} catch {
			return {};
		}
	})();
	if (typeof importMeta.env?.DEV === 'boolean') {
		return importMeta.env.DEV;
	}
	if (typeof importMeta.env?.PROD === 'boolean') {
		return !importMeta.env.PROD;
	}
	return true;
};

export async function resolveAuthToken(): Promise<string | null> {
	const stored = readStoredToken();
	if (stored) {
		return stored;
	}
	const globalToken = await readGlobalToken();
	if (globalToken) {
		return globalToken;
	}
	if (isDevelopmentEnvironment()) {
		return DEFAULT_DEV_TOKEN;
	}
	return null;
}

export { AUTH_TOKEN_STORAGE_KEY, DEFAULT_DEV_TOKEN };
