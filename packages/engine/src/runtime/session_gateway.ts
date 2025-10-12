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
	SessionRegistriesPayload,
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
	readonly registries?: SessionRegistriesPayload;
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
	const baseRegistries: SessionRegistriesPayload = options.registries ?? {
		actions: {},
		buildings: {},
		developments: {},
		populations: {},
		resources: {},
	};
	const getRegistries = (): SessionRegistriesPayload => {
		if (typeof structuredClone === 'function') {
			return structuredClone(baseRegistries);
		}
		return {
			actions: { ...baseRegistries.actions },
			buildings: { ...baseRegistries.buildings },
			developments: { ...baseRegistries.developments },
			populations: { ...baseRegistries.populations },
			resources: { ...baseRegistries.resources },
		};
	};
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
				registries: getRegistries(),
			});
		},
		fetchSnapshot(
			request: SessionAdvanceRequest,
		): Promise<SessionStateResponse> {
			assertSessionId(request, sessionId);
			return Promise.resolve({
				sessionId,
				snapshot: session.getSnapshot(),
				registries: getRegistries(),
			});
		},
		performAction(
			request: ActionExecuteRequest,
		): Promise<ActionExecuteResponse> {
			assertSessionId(request, sessionId);
			try {
				const params = toActionParameters(request.params);
				const rawCosts = session.getActionCosts(
					request.actionId,
					params as never,
				);
				const costs: Record<string, number> = {};
				for (const [resourceKey, amount] of Object.entries(rawCosts)) {
					if (typeof amount === 'number') {
						costs[resourceKey] = amount;
					}
				}
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
				registries: getRegistries(),
			});
		},
		getActionCosts(
			request: SessionActionCostRequest,
		): Promise<SessionActionCostResponse> {
			assertSessionId(request, sessionId);
			const params = toActionParameters(request.params);
			const rawCosts = session.getActionCosts(
				request.actionId,
				params as never,
			);
			const costs: Record<string, number> = {};
			for (const [resourceKey, amount] of Object.entries(rawCosts)) {
				if (typeof amount === 'number') {
					costs[resourceKey] = amount;
				}
			}
			return Promise.resolve({
				sessionId,
				costs,
			});
		},
		getActionRequirements(
			request: SessionActionRequirementRequest,
		): Promise<SessionActionRequirementResponse> {
			assertSessionId(request, sessionId);
			const params = toActionParameters(request.params);
			const requirements = session.getActionRequirements(
				request.actionId,
				params as never,
			);
			return Promise.resolve({
				sessionId,
				requirements,
			});
		},
		getActionOptions(
			request: SessionActionOptionsRequest,
		): Promise<SessionActionOptionsResponse> {
			assertSessionId(request, sessionId);
			const groups = session.getActionOptions(request.actionId);
			return Promise.resolve({
				sessionId,
				groups,
			});
		},
		runAiTurn(request: SessionRunAiRequest): Promise<SessionRunAiResponse> {
			assertSessionId(request, sessionId);
			return session.runAiTurn(request.playerId).then((ranTurn) => ({
				sessionId,
				ranTurn,
				snapshot: session.getSnapshot(),
				registries: getRegistries(),
			}));
		},
		simulateUpcomingPhases(
			request: SessionSimulateRequest,
		): Promise<SessionSimulateResponse> {
			assertSessionId(request, sessionId);
			const result = session.simulateUpcomingPhases(
				request.playerId,
				request.options,
			);
			return Promise.resolve({
				sessionId,
				result,
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
				registries: getRegistries(),
			});
		},
	};
}
