import type {
	ActionExecuteRequest,
	ActionExecuteResponse,
} from '@kingdom-builder/protocol/actions';
import type {
	SessionActionCostRequest,
	SessionActionCostResponse,
	SessionActionOptionsRequest,
	SessionActionOptionsResponse,
	SessionActionRequirementRequest,
	SessionActionRequirementResponse,
	SessionAdvanceRequest,
	SessionAdvanceResponse,
	SessionCreateRequest,
	SessionCreateResponse,
	SessionRunAiRequest,
	SessionRunAiResponse,
	SessionSetDevModeRequest,
	SessionSetDevModeResponse,
	SessionSimulateRequest,
	SessionSimulateResponse,
	SessionStateResponse,
	SessionUpdatePlayerNameRequest,
	SessionUpdatePlayerNameResponse,
} from '@kingdom-builder/protocol/session';
import type {
	AuthTokenProvider,
	FetchFn,
	GameApi,
	GameApiClientOptions,
	GameApiRequestOptions,
} from './gameApi.types';
import { GameApiError } from './gameApi.types';

const DEFAULT_HEADERS: ReadonlyArray<readonly [string, string]> = [
	['Accept', 'application/json'],
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

export class HttpGameApi implements GameApi {
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

	async setDevMode(
		request: SessionSetDevModeRequest,
		options: GameApiRequestOptions = {},
	): Promise<SessionSetDevModeResponse> {
		const { sessionId, enabled } = request;

		return this.#send(
			`/sessions/${encodeURIComponent(sessionId)}/dev-mode`,
			{
				method: 'POST',
				body: { enabled },
			},
			options,
		);
	}

	async updatePlayerName(
		request: SessionUpdatePlayerNameRequest,
		options: GameApiRequestOptions = {},
	): Promise<SessionUpdatePlayerNameResponse> {
		const { sessionId } = request;

		return this.#send(
			`/sessions/${encodeURIComponent(sessionId)}/player`,
			{
				method: 'PATCH',
				body: request,
			},
			options,
		);
	}

	async getActionCosts(
		request: SessionActionCostRequest,
		options: GameApiRequestOptions = {},
	): Promise<SessionActionCostResponse> {
		const { sessionId, actionId } = request;
		const encodedSessionId = encodeURIComponent(sessionId);
		const encodedActionId = encodeURIComponent(actionId);

		return this.#send(
			`/sessions/${encodedSessionId}/actions/${encodedActionId}/costs`,
			{
				method: 'POST',
				body: request,
			},
			options,
		);
	}

	async getActionRequirements(
		request: SessionActionRequirementRequest,
		options: GameApiRequestOptions = {},
	): Promise<SessionActionRequirementResponse> {
		const { sessionId, actionId } = request;
		const encodedSessionId = encodeURIComponent(sessionId);
		const encodedActionId = encodeURIComponent(actionId);

		return this.#send(
			`/sessions/${encodedSessionId}/actions/${encodedActionId}/requirements`,
			{
				method: 'POST',
				body: request,
			},
			options,
		);
	}

	async getActionOptions(
		request: SessionActionOptionsRequest,
		options: GameApiRequestOptions = {},
	): Promise<SessionActionOptionsResponse> {
		const { sessionId, actionId } = request;
		const encodedSessionId = encodeURIComponent(sessionId);
		const encodedActionId = encodeURIComponent(actionId);

		return this.#send(
			`/sessions/${encodedSessionId}/actions/${encodedActionId}/options`,
			{
				method: 'GET',
			},
			options,
		);
	}

	async runAiTurn(
		request: SessionRunAiRequest,
		options: GameApiRequestOptions = {},
	): Promise<SessionRunAiResponse> {
		const { sessionId } = request;

		return this.#send(
			`/sessions/${encodeURIComponent(sessionId)}/ai-turn`,
			{
				method: 'POST',
				body: request,
			},
			options,
		);
	}

	async simulateUpcomingPhases(
		request: SessionSimulateRequest,
		options: GameApiRequestOptions = {},
	): Promise<SessionSimulateResponse> {
		const { sessionId } = request;

		return this.#send(
			`/sessions/${encodeURIComponent(sessionId)}/simulate`,
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
		};

		if (options.signal) {
			requestInit.signal = options.signal;
		}

		if (init.body !== undefined) {
			if (!headers.has('Content-Type')) {
				headers.set('Content-Type', 'application/json');
			}

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

export const createHttpGameApi = (
	options: GameApiClientOptions = {},
): GameApi => new HttpGameApi(options);
