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
} from '@kingdom-builder/protocol';
import {
	actionExecuteRequestSchema,
	actionExecuteResponseSchema,
	sessionActionCostRequestSchema,
	sessionActionCostResponseSchema,
	sessionActionOptionsRequestSchema,
	sessionActionOptionsResponseSchema,
	sessionActionRequirementRequestSchema,
	sessionActionRequirementResponseSchema,
	sessionAdvanceRequestSchema,
	sessionAdvanceResponseSchema,
	sessionCreateRequestSchema,
	sessionCreateResponseSchema,
	sessionRunAiRequestSchema,
	sessionRunAiResponseSchema,
	sessionSetDevModeRequestSchema,
	sessionSetDevModeResponseSchema,
	sessionSimulateRequestSchema,
	sessionSimulateResponseSchema,
	sessionStateResponseSchema,
} from '@kingdom-builder/protocol';
import { TransportError } from '../transport/TransportTypes.js';
import type { TransportErrorCode } from '../transport/TransportTypes.js';
import type {
	FetchLike,
	HeaderFactory,
	HeaderInput,
	RequestOptions,
	HttpExecutionResult,
	FetchActionCostsHandler,
	FetchActionRequirementsHandler,
	FetchActionOptionsHandler,
	RunAiTurnHandler,
	SimulatePhasesHandler,
} from './HttpSessionGatewayTypes.js';
export interface HttpSessionGatewayOptions {
	readonly baseUrl: string;
	readonly fetch?: FetchLike;
	readonly headers?: HeaderFactory;
}
export class HttpSessionGateway implements SessionGateway {
	private readonly baseUrl: string;
	private readonly fetchImpl: FetchLike;
	private readonly headerFactory?: () => Promise<HeaderInput>;
	public readonly fetchActionCosts: FetchActionCostsHandler =
		this.createActionHandler(
			sessionActionCostRequestSchema,
			'actions/costs',
			sessionActionCostResponseSchema,
		) as FetchActionCostsHandler;
	public readonly getActionCosts: SessionGateway['getActionCosts'] = this
		.fetchActionCosts as SessionGateway['getActionCosts'];
	public readonly fetchActionRequirements: FetchActionRequirementsHandler =
		this.createActionHandler(
			sessionActionRequirementRequestSchema,
			'actions/requirements',
			sessionActionRequirementResponseSchema,
		) as FetchActionRequirementsHandler;
	public readonly getActionRequirements: SessionGateway['getActionRequirements'] =
		this.fetchActionRequirements as SessionGateway['getActionRequirements'];
	public readonly fetchActionOptions: FetchActionOptionsHandler =
		this.createActionHandler(
			sessionActionOptionsRequestSchema,
			'actions/options',
			sessionActionOptionsResponseSchema,
		) as FetchActionOptionsHandler;
	public readonly getActionOptions: SessionGateway['getActionOptions'] = this
		.fetchActionOptions as SessionGateway['getActionOptions'];
	public readonly runAiTurn: SessionGateway['runAiTurn'] =
		this.createActionHandler(
			sessionRunAiRequestSchema,
			'ai',
			sessionRunAiResponseSchema,
		) as RunAiTurnHandler;
	public readonly simulateUpcomingPhases: SessionGateway['simulateUpcomingPhases'] =
		this.createActionHandler(
			sessionSimulateRequestSchema,
			'simulate',
			sessionSimulateResponseSchema,
		) as SimulatePhasesHandler;
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
	private async postSessionRequest<ResponseType>(
		path: string,
		body: unknown,
		schema: { parse(data: unknown): ResponseType },
	): Promise<ResponseType> {
		const result = await this.execute({
			method: 'POST',
			path,
			body,
		});
		if (!result.response.ok) {
			throw this.toTransportError(result);
		}
		return schema.parse(result.data);
	}
	private postSessionDetail<ResponseType>(
		payload: { sessionId: string },
		suffix: string,
		schema: { parse(data: unknown): ResponseType },
	): Promise<ResponseType> {
		return this.postSessionRequest(
			`sessions/${this.encodeSessionId(payload.sessionId)}/${suffix}`,
			payload,
			schema,
		);
	}
	private createActionHandler<
		RequestType extends { sessionId: string },
		ResponseType,
	>(
		requestSchema: { parse(data: unknown): RequestType },
		suffix: string,
		responseSchema: { parse(data: unknown): ResponseType },
	): (request: RequestType) => Promise<ResponseType> {
		return async (request) => {
			const payload = requestSchema.parse(request);
			return this.postSessionDetail(payload, suffix, responseSchema);
		};
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
}
