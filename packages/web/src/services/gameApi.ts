import type {
	ActionExecuteRequest,
	ActionExecuteResponse,
} from '@kingdom-builder/protocol/actions';
import type {
	SessionAdvanceRequest,
	SessionAdvanceResponse,
	SessionCreateRequest,
	SessionCreateResponse,
	SessionStateResponse,
} from '@kingdom-builder/protocol/session';

type FetchFn = (input: RequestInfo, init?: RequestInit) => Promise<Response>;

type AuthTokenProvider = () =>
	| string
	| undefined
	| null
	| Promise<string | undefined | null>;

export interface GameApiClientOptions {
	baseUrl?: string;
	fetchFn?: FetchFn;
	headers?: HeadersInit;
	getAuthToken?: AuthTokenProvider;
}

export interface GameApiRequestOptions {
	signal?: AbortSignal;
}

export interface GameApi {
	createSession(
		request?: SessionCreateRequest,
		options?: GameApiRequestOptions,
	): Promise<SessionCreateResponse>;
	fetchSnapshot(
		sessionId: string,
		options?: GameApiRequestOptions,
	): Promise<SessionStateResponse>;
	performAction(
		request: ActionExecuteRequest,
		options?: GameApiRequestOptions,
	): Promise<ActionExecuteResponse>;
	advancePhase(
		request: SessionAdvanceRequest,
		options?: GameApiRequestOptions,
	): Promise<SessionAdvanceResponse>;
}

export class GameApiError extends Error {
	readonly status: number;
	readonly statusText: string;
	readonly body: unknown;

	constructor(
		message: string,
		status: number,
		statusText: string,
		body: unknown,
	) {
		super(message);
		this.name = 'GameApiError';
		this.status = status;
		this.statusText = statusText;
		this.body = body;
	}
}

const DEFAULT_HEADERS: ReadonlyArray<readonly [string, string]> = [
	['Accept', 'application/json'],
	['Content-Type', 'application/json'],
];

const ensureHeaders = (headers?: HeadersInit) => {
	const merged = new Headers(headers);

	for (const [key, value] of DEFAULT_HEADERS) {
		if (!merged.has(key)) {
			merged.set(key, value);
		}
	}

	return merged;
};

const ensureFetch = (fetchFn?: FetchFn): FetchFn => {
	if (fetchFn) {
		return fetchFn;
	}

	const globalFetch = (
		globalThis as typeof globalThis & {
			fetch?: typeof fetch;
		}
	).fetch;

	if (!globalFetch) {
		throw new Error('Global fetch API is unavailable.');
	}

	return globalFetch.bind(globalThis);
};

const isJsonContentType = (value: string) => {
	const normalized = value.toLowerCase();

	return (
		normalized.includes('application/json') || normalized.includes('+json')
	);
};

class HttpGameApi implements GameApi {
	#baseUrl: string;
	#fetch: FetchFn;
	#headers: Headers;
	#getAuthToken: AuthTokenProvider | undefined;

	constructor(options: GameApiClientOptions = {}) {
		this.#baseUrl = options.baseUrl ?? '/api';
		this.#fetch = ensureFetch(options.fetchFn);
		this.#headers = ensureHeaders(options.headers);
		this.#getAuthToken = options.getAuthToken;
	}

	async createSession(
		request: SessionCreateRequest = {},
		options: GameApiRequestOptions = {},
	): Promise<SessionCreateResponse> {
		return this.#send(
			'/sessions',
			{
				method: 'POST',
				body: request,
			},
			options,
		);
	}

	async fetchSnapshot(
		sessionId: string,
		options: GameApiRequestOptions = {},
	): Promise<SessionStateResponse> {
		return this.#send(
			`/sessions/${encodeURIComponent(sessionId)}/snapshot`,
			{
				method: 'GET',
			},
			options,
		);
	}

	async performAction(
		request: ActionExecuteRequest,
		options: GameApiRequestOptions = {},
	): Promise<ActionExecuteResponse> {
		const { sessionId } = request;

		return this.#send(
			`/sessions/${encodeURIComponent(sessionId)}/actions`,
			{
				method: 'POST',
				body: request,
			},
			options,
		);
	}

	async advancePhase(
		request: SessionAdvanceRequest,
		options: GameApiRequestOptions = {},
	): Promise<SessionAdvanceResponse> {
		const { sessionId } = request;

		return this.#send(
			`/sessions/${encodeURIComponent(sessionId)}/advance`,
			{
				method: 'POST',
				body: request,
			},
			options,
		);
	}

	async #send<TResponse>(
		path: string,
		init: { method: string; body?: unknown },
		options: GameApiRequestOptions = {},
	): Promise<TResponse> {
		const headers = ensureHeaders(this.#headers);

		if (this.#getAuthToken) {
			const token = await this.#getAuthToken();

			if (token) {
				headers.set('Authorization', `Bearer ${token}`);
			}
		}

		const requestInit: RequestInit = {
			method: init.method,
			headers,
			signal: options.signal ?? null,
		};

		if (init.body !== undefined) {
			requestInit.body = JSON.stringify(init.body);
		}

		const response = await this.#fetch(`${this.#baseUrl}${path}`, requestInit);

		if (!response.ok) {
			const errorPayload = await this.#extractPayload(response);

			throw new GameApiError(
				'Game service request failed.',
				response.status,
				response.statusText,
				errorPayload,
			);
		}

		const payload = await this.#extractPayload(response);

		return payload as TResponse;
	}
	async #extractPayload(response: Response): Promise<unknown> {
		const contentType = response.headers.get('content-type');

		if (!contentType) {
			return undefined;
		}

		if (isJsonContentType(contentType)) {
			const data: unknown = await response.json();
			return data;
		}

		const text = await response.text();
		return text;
	}
}

export const createGameApi = (options: GameApiClientOptions = {}): GameApi =>
	new HttpGameApi(options);

export type { GameApiMockHandlers, GameApiFakeState } from './gameApi.mocks';
export { createGameApiMock, GameApiFake } from './gameApi.mocks';
