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

export type FetchFn = (
	input: RequestInfo,
	init?: RequestInit,
) => Promise<Response>;

export type AuthTokenProvider = () =>
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
	setDevMode(
		request: SessionSetDevModeRequest,
		options?: GameApiRequestOptions,
	): Promise<SessionSetDevModeResponse>;
	updatePlayerName(
		request: SessionUpdatePlayerNameRequest,
		options?: GameApiRequestOptions,
	): Promise<SessionUpdatePlayerNameResponse>;
	getActionCosts(
		request: SessionActionCostRequest,
		options?: GameApiRequestOptions,
	): Promise<SessionActionCostResponse>;
	getActionRequirements(
		request: SessionActionRequirementRequest,
		options?: GameApiRequestOptions,
	): Promise<SessionActionRequirementResponse>;
	getActionOptions(
		request: SessionActionOptionsRequest,
		options?: GameApiRequestOptions,
	): Promise<SessionActionOptionsResponse>;
	runAiTurn(
		request: SessionRunAiRequest,
		options?: GameApiRequestOptions,
	): Promise<SessionRunAiResponse>;
	simulateUpcomingPhases(
		request: SessionSimulateRequest,
		options?: GameApiRequestOptions,
	): Promise<SessionSimulateResponse>;
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
