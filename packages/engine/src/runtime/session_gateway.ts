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
	SessionRegistryPayload,
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
	readonly registries?: SessionRegistryPayload;
}

type CloneFn = <T>(value: T) => T;

const globalClone = (globalThis as { structuredClone?: <T>(value: T) => T })
	.structuredClone;

function jsonClone<T>(value: T): T {
	return JSON.parse(JSON.stringify(value)) as T;
}

const clone: CloneFn = globalClone ? (value) => globalClone(value) : jsonClone;

const EMPTY_REGISTRIES: SessionRegistryPayload = {
	actions: {},
	buildings: {},
	developments: {},
	populations: {},
	resources: {},
};

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
	const registries = options.registries ?? EMPTY_REGISTRIES;
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
				registries: clone(registries),
			});
		},
		fetchSnapshot(
			request: SessionAdvanceRequest,
		): Promise<SessionStateResponse> {
			assertSessionId(request, sessionId);
			return Promise.resolve({
				sessionId,
				snapshot: session.getSnapshot(),
				registries: clone(registries),
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
				registries: clone(registries),
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
				registries: clone(registries),
			});
		},
	};
}
