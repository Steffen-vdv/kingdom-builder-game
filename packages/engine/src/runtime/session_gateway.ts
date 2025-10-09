import type {
	SessionGateway,
	SessionCreateRequest,
	SessionCreateResponse,
	SessionStateResponse,
	SessionAdvanceRequest,
	SessionAdvanceResponse,
	SessionSetDevModeRequest,
	SessionSetDevModeResponse,
	SessionRequirementFailure,
	SessionActionRequirementList,
	ActionExecuteRequest,
	ActionExecuteResponse,
	ActionExecuteSuccessResponse,
	ActionExecuteErrorResponse,
} from '@kingdom-builder/protocol';
import type { EngineSession } from './session';
import type { PlayerId } from '../state';
import type { ActionParameters } from '../actions/action_parameters';

interface LocalSessionGatewayOptions {
	readonly sessionId?: string;
}

interface RequirementError extends Error {
	readonly requirementFailure?: SessionRequirementFailure;
	readonly requirementFailures?: SessionActionRequirementList;
}

function normalizePlayerNames(
	session: EngineSession,
	playerNames: SessionCreateRequest['playerNames'],
): void {
	if (!playerNames) {
		return;
	}
	for (const [playerId, name] of Object.entries(playerNames)) {
		if (!name) {
			continue;
		}
		session.updatePlayerName(playerId as PlayerId, name);
	}
}

function assertSessionId(
	request: { sessionId: string },
	expected: string,
): void {
	if (request.sessionId === expected) {
		return;
	}
	throw new Error(`Unknown session: ${request.sessionId}`);
}

function toActionParameters(
	params: ActionExecuteRequest['params'],
): ActionParameters<string> | undefined {
	if (!params) {
		return undefined;
	}
	return params as ActionParameters<string>;
}

function normalizeCostBag(
	costs: ReturnType<EngineSession['getActionCosts']>,
): Record<string, number> {
	const normalized: Record<string, number> = {};
	for (const [resourceKey, value] of Object.entries(costs)) {
		if (typeof value === 'number') {
			normalized[resourceKey] = value;
		}
	}
	return normalized;
}

function toErrorMessage(error: unknown): string {
	if (typeof error === 'string') {
		return error;
	}
	if (error instanceof Error) {
		return error.message;
	}
	return 'Unknown error';
}

function toActionErrorResponse(error: unknown): ActionExecuteErrorResponse {
	const requirementError = error as RequirementError;
	const response: ActionExecuteErrorResponse = {
		status: 'error',
		error: toErrorMessage(error),
	};
	if (requirementError.requirementFailure) {
		response.requirementFailure = requirementError.requirementFailure;
	}
	if (requirementError.requirementFailures) {
		response.requirementFailures = requirementError.requirementFailures;
	}
	return response;
}

function toActionSuccessResponse(
	session: EngineSession,
	traces: ReturnType<EngineSession['performAction']>,
	costs: Record<string, number>,
): ActionExecuteSuccessResponse {
	return {
		status: 'success',
		traces,
		snapshot: session.getSnapshot(),
		costs,
	};
}

export function createLocalSessionGateway(
	session: EngineSession,
	options: LocalSessionGatewayOptions = {},
): SessionGateway {
	const sessionId = options.sessionId ?? 'local-session';
	return {
		createSession(
			request?: SessionCreateRequest,
		): Promise<SessionCreateResponse> {
			const devMode = request?.devMode ?? false;
			session.setDevMode(devMode);
			normalizePlayerNames(session, request?.playerNames);
			return Promise.resolve({
				sessionId,
				snapshot: session.getSnapshot(),
			});
		},
		fetchSnapshot(
			request: SessionAdvanceRequest,
		): Promise<SessionStateResponse> {
			assertSessionId(request, sessionId);
			return Promise.resolve({
				sessionId,
				snapshot: session.getSnapshot(),
			});
		},
		performAction(
			request: ActionExecuteRequest,
		): Promise<ActionExecuteResponse> {
			assertSessionId(request, sessionId);
			try {
				const params = toActionParameters(request.params);
				const rawCosts = session.getActionCosts(request.actionId, params);
				const costs = normalizeCostBag(rawCosts);
				const traces = session.performAction(request.actionId, params);
				return Promise.resolve(toActionSuccessResponse(session, traces, costs));
			} catch (error) {
				return Promise.resolve(toActionErrorResponse(error));
			}
		},
		advancePhase(
			request: SessionAdvanceRequest,
		): Promise<SessionAdvanceResponse> {
			assertSessionId(request, sessionId);
			const advance = session.advancePhase();
			return Promise.resolve({
				sessionId,
				snapshot: session.getSnapshot(),
				advance,
			});
		},
		setDevMode(
			request: SessionSetDevModeRequest,
		): Promise<SessionSetDevModeResponse> {
			assertSessionId(request, sessionId);
			session.setDevMode(request.enabled);
			return Promise.resolve({
				sessionId,
				snapshot: session.getSnapshot(),
			});
		},
	};
}
