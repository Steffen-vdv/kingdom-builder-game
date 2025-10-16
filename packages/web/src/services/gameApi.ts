import type {
	AuthTokenProvider,
	GameApi,
	GameApiClientOptions,
} from './gameApi.types';
import { createHttpGameApi } from './gameApi.http';

export type {
	GameApi,
	GameApiClientOptions,
	GameApiRequestOptions,
	FetchFn,
	AuthTokenProvider,
} from './gameApi.types';
export { GameApiError } from './gameApi.types';

export const createGameApi = (options: GameApiClientOptions = {}): GameApi =>
	createHttpGameApi(withDefaultAuthProvider(options));

function withDefaultAuthProvider(
	options: GameApiClientOptions,
): GameApiClientOptions {
	if (options.getAuthToken) {
		return options;
	}
	const token = readDevAuthToken();
	if (!token) {
		return options;
	}
	return {
		...options,
		getAuthToken: createStaticTokenProvider(token),
	};
}

function createStaticTokenProvider(token: string): AuthTokenProvider {
	return () => token;
}

function readDevAuthToken(): string | null {
	const envToken = readEnvDevToken();
	if (envToken) {
		return envToken;
	}
	const globalToken = readGlobalDevToken();
	return globalToken ?? null;
}

function readEnvDevToken(): string | null {
	const envScope = import.meta as {
		readonly env?: { VITE_KB_DEV_TOKEN?: unknown };
	};
	const raw = envScope.env?.VITE_KB_DEV_TOKEN;
	if (typeof raw !== 'string') {
		return null;
	}
	return normalizeToken(raw);
}

function readGlobalDevToken(): string | null {
	if (typeof globalThis !== 'object' || !globalThis) {
		return null;
	}
	const scope = globalThis as {
		__KINGDOM_BUILDER_DEV_TOKEN__?: unknown;
	};
	const raw = scope.__KINGDOM_BUILDER_DEV_TOKEN__;
	if (typeof raw !== 'string') {
		return null;
	}
	return normalizeToken(raw);
}

function normalizeToken(value: string): string | null {
	const trimmed = value.trim();
	return trimmed.length > 0 ? trimmed : null;
}

export type { GameApiMockHandlers, GameApiFakeState } from './gameApi.mocks';
export { createGameApiMock, GameApiFake } from './gameApi.mocks';
