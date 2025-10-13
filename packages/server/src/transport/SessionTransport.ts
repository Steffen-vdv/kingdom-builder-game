import {
	sessionActionCostRequestSchema,
	sessionActionCostResponseSchema,
	sessionActionRequirementRequestSchema,
	sessionActionRequirementResponseSchema,
	sessionActionOptionsRequestSchema,
	sessionActionOptionsResponseSchema,
	sessionRunAiRequestSchema,
	sessionRunAiResponseSchema,
	sessionSimulateRequestSchema,
	sessionSimulateResponseSchema,
} from '@kingdom-builder/protocol';
import type {
	SessionActionCostResponse,
	SessionActionRequirementResponse,
	SessionActionOptionsResponse,
	SessionRunAiResponse,
	SessionSimulateResponse,
} from '@kingdom-builder/protocol';
import type { EngineSession } from '@kingdom-builder/engine';
import type { infer as Infer } from 'zod';
import type { TransportRequest } from './TransportTypes.js';
import { TransportError } from './TransportTypes.js';
import { SessionTransportBase } from './SessionTransportBase.js';
import type { SessionTransportOptions } from './SessionTransportBase.js';

type ActionMetadataRequest = {
	session: EngineSession;
	sessionId: string;
	actionId: string;
	params?: Record<string, unknown>;
};

type ActionMetadataPayload = Infer<typeof sessionActionCostRequestSchema>;

type ActionMetadataSchema =
	| typeof sessionActionCostRequestSchema
	| typeof sessionActionRequirementRequestSchema
	| typeof sessionActionOptionsRequestSchema;

export class SessionTransport extends SessionTransportBase {
	public constructor(options: SessionTransportOptions) {
		super(options);
	}

	public getActionCosts(request: TransportRequest): SessionActionCostResponse {
		this.requireAuthorization(request, 'session:advance');
		const { session, sessionId, actionId, params } =
			this.parseActionMetadataRequest(
				request,
				sessionActionCostRequestSchema,
				'Invalid action cost request.',
			);
		const rawCosts = session.getActionCosts(actionId, params as never);
		const costs: Record<string, number> = {};
		for (const [resourceKey, amount] of Object.entries(rawCosts)) {
			if (typeof amount === 'number') {
				costs[resourceKey] = amount;
			}
		}
		const response = {
			sessionId,
			costs,
		} satisfies SessionActionCostResponse;
		return sessionActionCostResponseSchema.parse(response);
	}

	public getActionRequirements(
		request: TransportRequest,
	): SessionActionRequirementResponse {
		this.requireAuthorization(request, 'session:advance');
		const { session, sessionId, actionId, params } =
			this.parseActionMetadataRequest(
				request,
				sessionActionRequirementRequestSchema,
				'Invalid action requirement request.',
			);
		const requirements = session.getActionRequirements(
			actionId,
			params as never,
		);
		const response = {
			sessionId,
			requirements,
		} satisfies SessionActionRequirementResponse;
		return sessionActionRequirementResponseSchema.parse(response);
	}

	public getActionOptions(
		request: TransportRequest,
	): SessionActionOptionsResponse {
		this.requireAuthorization(request, 'session:advance');
		const { session, sessionId, actionId } = this.parseActionMetadataRequest(
			request,
			sessionActionOptionsRequestSchema,
			'Invalid action options request.',
		);
		const groups = session.getActionOptions(actionId);
		const response = {
			sessionId,
			groups,
		} satisfies SessionActionOptionsResponse;
		return sessionActionOptionsResponseSchema.parse(response);
	}

	public async runAiTurn(
		request: TransportRequest,
	): Promise<SessionRunAiResponse> {
		this.requireAuthorization(request, 'session:advance');
		const parsed = sessionRunAiRequestSchema.safeParse(request.body);
		if (!parsed.success) {
			throw new TransportError('INVALID_REQUEST', 'Invalid AI turn request.', {
				issues: parsed.error.issues,
			});
		}
		const { sessionId, playerId } = parsed.data;
		const session = this.requireSession(sessionId);
		if (!session.hasAiController(playerId)) {
			throw new TransportError(
				'CONFLICT',
				`No AI controller is available for player "${playerId}".`,
			);
		}
		try {
			const ranTurn = await session.enqueue(() => session.runAiTurn(playerId));
			const snapshot = this.sessionManager.getSnapshot(sessionId);
			const base = this.buildStateResponse(sessionId, snapshot);
			const response = {
				...base,
				ranTurn,
			} satisfies SessionRunAiResponse;
			return sessionRunAiResponseSchema.parse(response);
		} catch (error) {
			throw new TransportError('CONFLICT', 'Failed to execute AI turn.', {
				cause: error,
			});
		}
	}

	public simulateUpcomingPhases(
		request: TransportRequest,
	): SessionSimulateResponse {
		this.requireAuthorization(request, 'session:advance');
		const parsed = sessionSimulateRequestSchema.safeParse(request.body);
		if (!parsed.success) {
			throw new TransportError(
				'INVALID_REQUEST',
				'Invalid simulation request.',
				{ issues: parsed.error.issues },
			);
		}
		const { sessionId, playerId, options } = parsed.data;
		const session = this.requireSession(sessionId);
		const result = session.simulateUpcomingPhases(playerId, options);
		const response = {
			sessionId,
			result,
		} satisfies SessionSimulateResponse;
		return sessionSimulateResponseSchema.parse(response);
	}

	private parseActionMetadataRequest(
		request: TransportRequest,
		schema: ActionMetadataSchema,
		errorMessage: string,
	): ActionMetadataRequest {
		const parsed = schema.safeParse(request.body);
		if (!parsed.success) {
			throw new TransportError('INVALID_REQUEST', errorMessage, {
				issues: parsed.error.issues,
			});
		}
		const { sessionId, actionId, params } =
			parsed.data as ActionMetadataPayload;
		const session = this.requireSession(sessionId);
		this.requireActionDefinition(session, actionId, sessionId);
		const metadataRequest: ActionMetadataRequest = {
			session,
			sessionId,
			actionId,
		};
		if (params !== undefined) {
			metadataRequest.params = params;
		}
		return metadataRequest;
	}

	private requireActionDefinition(
		session: EngineSession,
		actionId: string,
		sessionId: string,
	): void {
		try {
			const definition = session.getActionDefinition(actionId);
			if (!definition) {
				throw new TransportError(
					'NOT_FOUND',
					`Action "${actionId}" was not found in session "${sessionId}".`,
				);
			}
		} catch (error) {
			throw new TransportError(
				'NOT_FOUND',
				`Action "${actionId}" was not found in session "${sessionId}".`,
				{ cause: error },
			);
		}
	}
}

export type { SessionTransportOptions } from './SessionTransportBase.js';
export { PLAYER_NAME_MAX_LENGTH } from './SessionTransportBase.js';
