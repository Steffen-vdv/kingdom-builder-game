import type {
	ActionExecuteRequest,
	ActionExecuteResponse,
	SessionAdvanceRequest,
	SessionAdvanceResponse,
	SessionCreateRequest,
	SessionCreateResponse,
	SessionGateway,
	SessionSetDevModeRequest,
	SessionSetDevModeResponse,
	SessionStateResponse,
	SessionActionCostRequest,
	SessionActionCostResponse,
	SessionActionRequirementRequest,
	SessionActionRequirementResponse,
	SessionActionOptionsRequest,
	SessionActionOptionsResponse,
	SessionRunAiRequest,
	SessionRunAiResponse,
	SessionSimulateRequest,
	SessionSimulateResponse,
} from '@kingdom-builder/protocol';
import {
	actionExecuteRequestSchema,
	actionExecuteResponseSchema,
	sessionAdvanceRequestSchema,
	sessionAdvanceResponseSchema,
	sessionCreateRequestSchema,
	sessionCreateResponseSchema,
	sessionSetDevModeRequestSchema,
	sessionSetDevModeResponseSchema,
	sessionStateResponseSchema,
} from '@kingdom-builder/protocol';
import type { ZodType } from 'zod';
import {
	createActionMetadataClient,
	type ActionMetadataClient,
} from './ActionMetadataClient.js';
import { TransportError } from '../transport/TransportTypes.js';
import type { TransportErrorCode } from '../transport/TransportTypes.js';

type FetchLike = typeof fetch;
type HeaderInput = ConstructorParameters<typeof Headers>[0];
type HeaderFactory = HeaderInput | (() => HeaderInput | Promise<HeaderInput>);
interface RequestOptions {
	readonly method: string;
	readonly path: string;
	readonly body?: unknown;
}
interface HttpExecutionResult {
	readonly response: Response;
	readonly data: unknown;
}

export interface HttpSessionGatewayOptions {
	readonly baseUrl: string;
	readonly fetch?: FetchLike;
	readonly headers?: HeaderFactory;
}

export class HttpSessionGateway implements SessionGateway {
	private readonly baseUrl: string;

	private readonly fetchImpl: FetchLike;

	private readonly headerFactory?: () => Promise<HeaderInput>;

	private readonly actionMetadata: ActionMetadataClient;

	public fetchActionCosts: ActionMetadataClient['fetchActionCosts'];

	public fetchActionRequirements: ActionMetadataClient['fetchActionRequirements'];

	public fetchActionOptions: ActionMetadataClient['fetchActionOptions'];

	public getActionCosts: SessionGateway['getActionCosts'];

	public getActionRequirements: SessionGateway['getActionRequirements'];

	public getActionOptions: SessionGateway['getActionOptions'];

	public runAiTurn: ActionMetadataClient['runAiTurn'];

	public simulateUpcomingPhases: ActionMetadataClient['simulateUpcomingPhases'];

	public constructor(options: HttpSessionGatewayOptions) {
		const normalizedBase = options.baseUrl.endsWith('/')
			? options.baseUrl
			: `${options.baseUrl}/`;
		this.baseUrl = normalizedBase;
		const fetchImpl = options.fetch ?? globalThis.fetch;
		if (!fetchImpl) {
			throw new Error('Fetch API is not available in this environment.');
		}
		this.fetchImpl = fetchImpl.bind(globalThis);
		if (typeof options.headers === 'function') {
			const factory = options.headers;
			this.headerFactory = () => Promise.resolve(factory());
		} else if (options.headers) {
			const headers = options.headers;
			this.headerFactory = () => Promise.resolve(headers);
		}
		this.actionMetadata = createActionMetadataClient({
			requestAndParse: (requestOptions, schema) =>
				this.requestAndParse(requestOptions, schema),
			encodeSessionId: (value) => this.encodeSessionId(value),
			encodeActionId: (value) => this.encodeActionId(value),
			encodePlayerId: (value) => this.encodePlayerId(value),
		});
                const metadata = this.actionMetadata;
                this.fetchActionCosts = metadata.fetchActionCosts;
                this.fetchActionRequirements = metadata.fetchActionRequirements;
                this.fetchActionOptions = metadata.fetchActionOptions;
                this.runAiTurn = metadata.runAiTurn;
                this.simulateUpcomingPhases = metadata.simulateUpcomingPhases;
                this.getActionCosts = metadata.fetchActionCosts;
                this.getActionRequirements = metadata.fetchActionRequirements;
                this.getActionOptions = metadata.fetchActionOptions;
	}

	public async createSession(
		request?: SessionCreateRequest,
	): Promise<SessionCreateResponse> {
		const payload = request
			? sessionCreateRequestSchema.parse(request)
			: sessionCreateRequestSchema.parse({});
		const result = await this.execute({
			method: 'POST',
			path: 'sessions',
			body: payload,
		});
		if (!result.response.ok) {
			throw this.toTransportError(result);
		}
		return sessionCreateResponseSchema.parse(result.data);
	}

	public async fetchSnapshot(
		request: SessionAdvanceRequest,
	): Promise<SessionStateResponse> {
		const payload = sessionAdvanceRequestSchema.parse(request);
		const result = await this.execute({
			method: 'GET',
			path: `sessions/${this.encodeSessionId(payload.sessionId)}/snapshot`,
		});
		if (!result.response.ok) {
			throw this.toTransportError(result);
		}
		return sessionStateResponseSchema.parse(result.data);
	}

	public async performAction(
		request: ActionExecuteRequest,
	): Promise<ActionExecuteResponse> {
		const payload = actionExecuteRequestSchema.parse(request);
		const result = await this.execute({
			method: 'POST',
			path: `sessions/${this.encodeSessionId(payload.sessionId)}/actions`,
			body: payload,
		});
		if (!result.response.ok) {
			try {
				const parsed = actionExecuteResponseSchema.parse(
					result.data,
				) as ActionExecuteResponse;
				return parsed;
			} catch (error) {
				throw this.toTransportError(result, error);
			}
		}
		const parsed = actionExecuteResponseSchema.parse(
			result.data,
		) as ActionExecuteResponse;
		return parsed;
	}

	public async advancePhase(
		request: SessionAdvanceRequest,
	): Promise<SessionAdvanceResponse> {
		const payload = sessionAdvanceRequestSchema.parse(request);
		const result = await this.execute({
			method: 'POST',
			path: `sessions/${this.encodeSessionId(payload.sessionId)}/advance`,
		});
		if (!result.response.ok) {
			throw this.toTransportError(result);
		}
		return sessionAdvanceResponseSchema.parse(result.data);
	}

	public async setDevMode(
		request: SessionSetDevModeRequest,
	): Promise<SessionSetDevModeResponse> {
		const payload = sessionSetDevModeRequestSchema.parse(request);
		const result = await this.execute({
			method: 'POST',
			path: `sessions/${this.encodeSessionId(payload.sessionId)}/dev-mode`,
			body: { enabled: payload.enabled },
		});
		if (!result.response.ok) {
			throw this.toTransportError(result);
		}
		return sessionSetDevModeResponseSchema.parse(result.data);
	}

	private async requestAndParse<TResponse>(
		options: RequestOptions,
		schema: ZodType<TResponse>,
	): Promise<TResponse> {
		const result = await this.execute(options);
		if (!result.response.ok) {
			throw this.toTransportError(result);
		}
		return schema.parse(result.data);
	}

	private async execute(options: RequestOptions): Promise<HttpExecutionResult> {
		const request = await this.createRequest(options);
		const response = await this.fetchImpl(request);
		const data = await this.parseJson(response);
		return { response, data };
	}

	private async createRequest({
		method,
		path,
		body,
	}: RequestOptions): Promise<Request> {
		const url = new URL(this.normalizePath(path), this.baseUrl);
		const headers = new Headers(await this.resolveHeaders());
		const init: RequestInit = { method };
		if (body !== undefined) {
			init.body = JSON.stringify(body);
			headers.set('content-type', 'application/json');
		}
		init.headers = headers;
		return new Request(url, init);
	}

	private normalizePath(path: string): string {
		return path.startsWith('/') ? path.slice(1) : path;
	}

	private async resolveHeaders(): Promise<HeaderInput> {
		if (!this.headerFactory) {
			return {};
		}
		return this.headerFactory();
	}

	private async parseJson(response: Response): Promise<unknown> {
		const text = await response.text();
		if (!text) {
			return undefined;
		}
		try {
			const parsed: unknown = JSON.parse(text);
			return parsed;
		} catch (error) {
			throw new Error(
				`Failed to parse response from ${response.url}: ${String(error)}`,
			);
		}
	}

	private toTransportError(
		result: HttpExecutionResult,
		cause?: unknown,
	): TransportError {
		const { response, data } = result;
		const code = this.errorCodeFromStatus(response.status);
		if (data && typeof data === 'object') {
			const payload = data as {
				code?: unknown;
				message?: unknown;
				issues?: unknown;
			};
			if (
				typeof payload.code === 'string' &&
				this.isTransportErrorCode(payload.code) &&
				typeof payload.message === 'string'
			) {
				return new TransportError(payload.code, payload.message, {
					issues: payload.issues,
					cause: cause ?? result,
				});
			}
			if (typeof payload.message === 'string') {
				return new TransportError(code, payload.message, {
					issues: payload.issues,
					cause: cause ?? result,
				});
			}
		}
		const message = `Request to ${response.url} failed with status ${
			response.status
		}.`;
		return new TransportError(code, message, { cause: cause ?? result });
	}

	private errorCodeFromStatus(status: number): TransportErrorCode {
		switch (status) {
			case 400:
				return 'INVALID_REQUEST';
			case 401:
				return 'UNAUTHORIZED';
			case 403:
				return 'FORBIDDEN';
			case 404:
				return 'NOT_FOUND';
			case 409:
				return 'CONFLICT';
			default:
				return 'CONFLICT';
		}
	}

	private isTransportErrorCode(value: string): value is TransportErrorCode {
		return (
			value === 'INVALID_REQUEST' ||
			value === 'NOT_FOUND' ||
			value === 'CONFLICT' ||
			value === 'UNAUTHORIZED' ||
			value === 'FORBIDDEN'
		);
	}

	private encodeSessionId(sessionId: string): string {
		return encodeURIComponent(sessionId);
	}

	private encodeActionId(actionId: string): string {
		return encodeURIComponent(actionId);
	}

	private encodePlayerId(playerId: string): string {
		return encodeURIComponent(playerId);
	}
}
