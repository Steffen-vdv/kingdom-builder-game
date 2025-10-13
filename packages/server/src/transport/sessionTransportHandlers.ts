import {
	actionExecuteErrorResponseSchema,
	actionExecuteRequestSchema,
	actionExecuteResponseSchema,
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
	ActionExecuteErrorResponse,
	ActionExecuteSuccessResponse,
	SessionActionCostResponse,
	SessionActionRequirementResponse,
	SessionActionOptionsResponse,
	SessionRunAiResponse,
	SessionSimulateResponse,
	SessionSnapshot,
	SessionStateResponse,
} from '@kingdom-builder/protocol';
import type { EngineSession } from '@kingdom-builder/engine';
import { TransportError } from './TransportTypes.js';
import type {
	TransportHttpResponse,
	TransportRequest,
} from './TransportTypes.js';
import { normalizeActionTraces } from './engineTraceNormalizer.js';
import { extractRequirementFailures } from './extractRequirementFailures.js';

interface SessionDependencies {
	requireSession(sessionId: string): EngineSession;
}

interface RunAiDependencies extends SessionDependencies {
	buildStateResponse(
		sessionId: string,
		snapshot: SessionSnapshot,
	): SessionStateResponse;
}

interface ExecuteActionDependencies {
	authorize(): void;
	getSession(sessionId: string): EngineSession | undefined;
	attachHttpStatus<T extends object>(
		payload: T,
		status: number,
	): TransportHttpResponse<T>;
}

export function handleGetActionCosts(
	request: TransportRequest,
	deps: SessionDependencies,
): SessionActionCostResponse {
	const parsed = sessionActionCostRequestSchema.safeParse(request.body);
	if (!parsed.success) {
		throw new TransportError(
			'INVALID_REQUEST',
			'Invalid action cost request.',
			{ issues: parsed.error.issues },
		);
	}
	const { sessionId, actionId, params } = parsed.data;
	const session = deps.requireSession(sessionId);
	ensureActionExists(session, actionId);
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

export function handleGetActionRequirements(
	request: TransportRequest,
	deps: SessionDependencies,
): SessionActionRequirementResponse {
	const parsed = sessionActionRequirementRequestSchema.safeParse(request.body);
	if (!parsed.success) {
		throw new TransportError(
			'INVALID_REQUEST',
			'Invalid action requirement request.',
			{ issues: parsed.error.issues },
		);
	}
	const { sessionId, actionId, params } = parsed.data;
	const session = deps.requireSession(sessionId);
	ensureActionExists(session, actionId);
	const requirements = session.getActionRequirements(actionId, params as never);
	const response = {
		sessionId,
		requirements,
	} satisfies SessionActionRequirementResponse;
	return sessionActionRequirementResponseSchema.parse(response);
}

export function handleGetActionOptions(
	request: TransportRequest,
	deps: SessionDependencies,
): SessionActionOptionsResponse {
	const parsed = sessionActionOptionsRequestSchema.safeParse(request.body);
	if (!parsed.success) {
		throw new TransportError(
			'INVALID_REQUEST',
			'Invalid action options request.',
			{ issues: parsed.error.issues },
		);
	}
	const { sessionId, actionId } = parsed.data;
	const session = deps.requireSession(sessionId);
	ensureActionExists(session, actionId);
	const groups = session.getActionOptions(actionId);
	const response = {
		sessionId,
		groups,
	} satisfies SessionActionOptionsResponse;
	return sessionActionOptionsResponseSchema.parse(response);
}

export async function handleRunAiTurn(
	request: TransportRequest,
	deps: RunAiDependencies,
): Promise<SessionRunAiResponse> {
	const parsed = sessionRunAiRequestSchema.safeParse(request.body);
	if (!parsed.success) {
		throw new TransportError('INVALID_REQUEST', 'Invalid AI turn request.', {
			issues: parsed.error.issues,
		});
	}
	const { sessionId, playerId } = parsed.data;
	const session = deps.requireSession(sessionId);
	if (!session.hasAiController(playerId)) {
		throw new TransportError(
			'NOT_FOUND',
			`AI controller for player "${playerId}" was not found.`,
		);
	}
	try {
		const result = await session.enqueue(async () => {
			const ranTurn = await session.runAiTurn(playerId);
			const snapshot = session.getSnapshot();
			return { ranTurn, snapshot };
		});
		const response = {
			...deps.buildStateResponse(sessionId, result.snapshot),
			ranTurn: result.ranTurn,
		} satisfies SessionRunAiResponse;
		return sessionRunAiResponseSchema.parse(response);
	} catch (error) {
		throw new TransportError('CONFLICT', 'Failed to run AI turn.', {
			cause: error,
		});
	}
}

export function handleSimulateUpcomingPhases(
	request: TransportRequest,
	deps: SessionDependencies,
): SessionSimulateResponse {
	const parsed = sessionSimulateRequestSchema.safeParse(request.body);
	if (!parsed.success) {
		throw new TransportError('INVALID_REQUEST', 'Invalid simulation request.', {
			issues: parsed.error.issues,
		});
	}
	const { sessionId, playerId, options } = parsed.data;
	const session = deps.requireSession(sessionId);
	try {
		const result = session.simulateUpcomingPhases(playerId, options as never);
		const response = {
			sessionId,
			result,
		} satisfies SessionSimulateResponse;
		return sessionSimulateResponseSchema.parse(response);
	} catch (error) {
		throw new TransportError(
			'CONFLICT',
			'Failed to simulate upcoming phases.',
			{ cause: error },
		);
	}
}

export async function handleExecuteAction(
	request: TransportRequest,
	deps: ExecuteActionDependencies,
): Promise<
	| TransportHttpResponse<ActionExecuteSuccessResponse>
	| TransportHttpResponse<ActionExecuteErrorResponse>
> {
	const parsed = actionExecuteRequestSchema.safeParse(request.body);
	if (!parsed.success) {
		const response = actionExecuteErrorResponseSchema.parse({
			status: 'error',
			error: 'Invalid action request.',
		}) as ActionExecuteErrorResponse;
		return deps.attachHttpStatus(response, 400);
	}
	deps.authorize();
	const { sessionId, actionId, params } = parsed.data;
	const session = deps.getSession(sessionId);
	if (!session) {
		const response = actionExecuteErrorResponseSchema.parse({
			status: 'error',
			error: `Session "${sessionId}" was not found.`,
		}) as ActionExecuteErrorResponse;
		return deps.attachHttpStatus(response, 404);
	}
	try {
		const rawCosts = session.getActionCosts(actionId, params as never);
		const costs: Record<string, number> = {};
		for (const [resourceKey, amount] of Object.entries(rawCosts)) {
			if (typeof amount === 'number') {
				costs[resourceKey] = amount;
			}
		}
		const result = await session.enqueue(() => {
			const traces = session.performAction(actionId, params as never);
			const snapshot = session.getSnapshot();
			return { traces, snapshot };
		});
		const response = actionExecuteResponseSchema.parse({
			status: 'success',
			snapshot: result.snapshot,
			costs,
			traces: normalizeActionTraces(result.traces),
		}) as ActionExecuteSuccessResponse;
		return deps.attachHttpStatus(response, 200);
	} catch (error) {
		const failures = extractRequirementFailures(error);
		const message =
			error instanceof Error ? error.message : 'Action execution failed.';
		const base: ActionExecuteErrorResponse = {
			status: 'error',
			error: message,
		};
		if (failures.requirementFailure) {
			base.requirementFailure = failures.requirementFailure;
		}
		if (failures.requirementFailures) {
			base.requirementFailures = failures.requirementFailures;
		}
		const response = actionExecuteErrorResponseSchema.parse(
			base,
		) as ActionExecuteErrorResponse;
		return deps.attachHttpStatus(response, 409);
	}
}

function ensureActionExists(session: EngineSession, actionId: string): void {
	try {
		const definition = session.getActionDefinition(actionId);
		if (!definition) {
			throw new TransportError(
				'NOT_FOUND',
				`Action "${actionId}" was not found.`,
			);
		}
	} catch (error) {
		if (error instanceof Error && error.message.includes('Unknown id:')) {
			throw new TransportError(
				'NOT_FOUND',
				`Action "${actionId}" was not found.`,
				{
					cause: error,
				},
			);
		}
		throw error;
	}
}
