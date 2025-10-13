import type {
	SessionActionCostRequest,
	SessionActionCostResponse,
	SessionActionOptionsRequest,
	SessionActionOptionsResponse,
	SessionActionRequirementRequest,
	SessionActionRequirementResponse,
	SessionRunAiRequest,
	SessionRunAiResponse,
	SessionSimulateRequest,
	SessionSimulateResponse,
} from '@kingdom-builder/protocol';
import {
	sessionActionCostRequestSchema,
	sessionActionCostResponseSchema,
	sessionActionOptionsRequestSchema,
	sessionActionOptionsResponseSchema,
	sessionActionRequirementRequestSchema,
	sessionActionRequirementResponseSchema,
	sessionRunAiRequestSchema,
	sessionRunAiResponseSchema,
	sessionSimulateRequestSchema,
	sessionSimulateResponseSchema,
} from '@kingdom-builder/protocol';
import type { ZodType } from 'zod';

interface ActionRequestOptions {
	readonly method: string;
	readonly path: string;
	readonly body?: unknown;
}

export interface ActionMetadataClientDependencies {
	requestAndParse<TResponse>(
		options: ActionRequestOptions,
		schema: ZodType<TResponse>,
	): Promise<TResponse>;
	encodeSessionId(sessionId: string): string;
	encodeActionId(actionId: string): string;
	encodePlayerId(playerId: string): string;
}

export interface ActionMetadataClient {
	fetchActionCosts(
		request: SessionActionCostRequest,
	): Promise<SessionActionCostResponse>;
	fetchActionRequirements(
		request: SessionActionRequirementRequest,
	): Promise<SessionActionRequirementResponse>;
	fetchActionOptions(
		request: SessionActionOptionsRequest,
	): Promise<SessionActionOptionsResponse>;
	runAiTurn(request: SessionRunAiRequest): Promise<SessionRunAiResponse>;
	simulateUpcomingPhases(
		request: SessionSimulateRequest,
	): Promise<SessionSimulateResponse>;
}

export function createActionMetadataClient(
	deps: ActionMetadataClientDependencies,
): ActionMetadataClient {
	return {
		async fetchActionCosts(request) {
			const payload = sessionActionCostRequestSchema.parse(request);
			const path = buildActionPath(
				deps,
				payload.sessionId,
				payload.actionId,
				'costs',
			);
			return deps.requestAndParse(
				{
					method: 'POST',
					path,
					body: payload,
				},
				sessionActionCostResponseSchema,
			) as Promise<SessionActionCostResponse>;
		},
		async fetchActionRequirements(request) {
			const payload = sessionActionRequirementRequestSchema.parse(request);
			const path = buildActionPath(
				deps,
				payload.sessionId,
				payload.actionId,
				'requirements',
			);
			return deps.requestAndParse(
				{
					method: 'POST',
					path,
					body: payload,
				},
				sessionActionRequirementResponseSchema,
			) as Promise<SessionActionRequirementResponse>;
		},
		async fetchActionOptions(request) {
			const payload = sessionActionOptionsRequestSchema.parse(request);
			const path = buildActionPath(
				deps,
				payload.sessionId,
				payload.actionId,
				'options',
			);
			return deps.requestAndParse(
				{
					method: 'GET',
					path,
				},
				sessionActionOptionsResponseSchema,
			) as Promise<SessionActionOptionsResponse>;
		},
		async runAiTurn(request) {
			const payload = sessionRunAiRequestSchema.parse(request);
			const path = buildPlayerPath(
				deps,
				payload.sessionId,
				payload.playerId,
				'ai/turn',
			);
			return deps.requestAndParse(
				{
					method: 'POST',
					path,
					body: payload,
				},
				sessionRunAiResponseSchema,
			) as Promise<SessionRunAiResponse>;
		},
		async simulateUpcomingPhases(request) {
			const payload = sessionSimulateRequestSchema.parse(request);
			const path = buildPlayerPath(
				deps,
				payload.sessionId,
				payload.playerId,
				'simulate',
			);
			return deps.requestAndParse(
				{
					method: 'POST',
					path,
					body: payload,
				},
				sessionSimulateResponseSchema,
			) as Promise<SessionSimulateResponse>;
		},
	} satisfies ActionMetadataClient;
}

function buildActionPath(
	deps: ActionMetadataClientDependencies,
	sessionId: string,
	actionId: string,
	suffix: string,
): string {
	return `sessions/${deps.encodeSessionId(sessionId)}/actions/${deps.encodeActionId(
		actionId,
	)}/${suffix}`;
}

function buildPlayerPath(
	deps: ActionMetadataClientDependencies,
	sessionId: string,
	playerId: string,
	suffix: string,
): string {
	return `sessions/${deps.encodeSessionId(sessionId)}/players/${deps.encodePlayerId(
		playerId,
	)}/${suffix}`;
}
