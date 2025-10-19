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
	ActionParametersPayload,
	SessionActionCostResponse,
	SessionActionRequirementResponse,
	SessionActionOptionsResponse,
	SessionRunAiResponse,
	SessionSimulateResponse,
} from '@kingdom-builder/protocol';
import type { EngineSession } from '@kingdom-builder/engine';
import {
	parseActionParameters,
	type EngineActionParameters,
} from './actionParameterHelpers.js';
import type { TransportRequest } from './TransportTypes.js';
import { TransportError } from './TransportTypes.js';
import { SessionTransportBase } from './SessionTransportBase.js';
import type { SessionTransportOptions } from './SessionTransportBase.js';
import { normalizeActionTraces } from './engineTraceNormalizer.js';

type ActionMetadataRequest = {
	session: EngineSession;
	sessionId: string;
	actionId: string;
	params?: EngineActionParameters;
};

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
		const rawCosts = session.getActionCosts(actionId, params);
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
		const requirements = session.getActionRequirements(actionId, params);
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
			type AiOverrides = NonNullable<Parameters<EngineSession['runAiTurn']>[1]>;
			type AiPerformAction = Exclude<AiOverrides['performAction'], undefined>;
			type AiAdvance = Exclude<AiOverrides['advance'], undefined>;
			type AiContinueAfterAction = Exclude<
				AiOverrides['continueAfterAction'],
				undefined
			>;
			const actions: SessionRunAiResponse['actions'] = [];
			let phaseComplete = false;
			let performedAction = false;
			const sanitizeCostMap = (
				rawCosts: ReturnType<EngineSession['getActionCosts']>,
			): Record<string, number> => {
				const costs: Record<string, number> = {};
				for (const [resourceKey, amount] of Object.entries(rawCosts)) {
					if (typeof amount === 'number' && Number.isFinite(amount)) {
						costs[resourceKey] = amount;
					}
				}
				return costs;
			};
			const performAction: AiPerformAction = (actionId, _context, params) => {
				if (performedAction) {
					return [];
				}
				const normalizedParams = params as EngineActionParameters;
				const rawCosts = session.getActionCosts(actionId, normalizedParams);
				const costs = sanitizeCostMap(rawCosts);
				const traces = session.performAction(actionId, normalizedParams);
				const paramsPayload =
					normalizedParams === undefined
						? undefined
						: (structuredClone(normalizedParams) as ActionParametersPayload);
				const actionEntry: SessionRunAiResponse['actions'][number] = {
					actionId,
					costs,
					traces: normalizeActionTraces(traces),
				};
				if (paramsPayload !== undefined) {
					actionEntry.params = paramsPayload;
				}
				actions.push(actionEntry);
				performedAction = true;
				return traces;
			};
			const continueAfterAction: AiContinueAfterAction = () => {
				return !performedAction;
			};
			const advancePhase: AiAdvance = () => {
				phaseComplete = true;
				return undefined;
			};
			const overrides: AiOverrides = {
				performAction,
				continueAfterAction,
				advance: advancePhase,
			};
			const ranTurn = await session.enqueue(() =>
				session.runAiTurn(playerId, overrides),
			);
			const snapshot = this.sessionManager.getSnapshot(sessionId);
			const base = this.buildStateResponse(sessionId, snapshot);
			const response = {
				...base,
				ranTurn,
				actions,
				phaseComplete,
			} satisfies SessionRunAiResponse;
			return sessionRunAiResponseSchema.parse(response);
		} catch (error) {
			throw new TransportError('CONFLICT', 'Failed to execute AI turn.', {
				cause: error,
			});
		}
	}

	public async simulateUpcomingPhases(
		request: TransportRequest,
	): Promise<SessionSimulateResponse> {
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
		const result = await session.enqueue(() =>
			session.simulateUpcomingPhases(playerId, options),
		);
		const response = {
			sessionId,
			result,
		} satisfies SessionSimulateResponse;
		return sessionSimulateResponseSchema.parse(response);
	}

	private parseActionMetadataRequest<S extends ActionMetadataSchema>(
		request: TransportRequest,
		schema: S,
		errorMessage: string,
	): ActionMetadataRequest {
		const parsed = schema.safeParse(request.body);
		if (!parsed.success) {
			throw new TransportError('INVALID_REQUEST', errorMessage, {
				issues: parsed.error.issues,
			});
		}
		const { sessionId, actionId } = parsed.data;
		const session = this.requireSession(sessionId);
		this.requireActionDefinition(session, actionId, sessionId);
		const metadataRequest: ActionMetadataRequest = {
			session,
			sessionId,
			actionId,
		};
		if ('params' in parsed.data) {
			const normalized = parseActionParameters(
				parsed.data.params,
				errorMessage,
			);
			if (normalized !== undefined) {
				metadataRequest.params = normalized;
			}
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
