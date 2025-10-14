import { randomUUID } from 'node:crypto';
import {
	actionExecuteRequestSchema,
	actionExecuteResponseSchema,
	actionExecuteErrorResponseSchema,
	sessionCreateRequestSchema,
	sessionCreateResponseSchema,
	sessionAdvanceRequestSchema,
	sessionAdvanceResponseSchema,
	sessionRunAiRequestSchema,
	sessionRunAiResponseSchema,
	sessionSetDevModeRequestSchema,
	sessionSetDevModeResponseSchema,
	sessionStateResponseSchema,
	sessionUpdatePlayerNameRequestSchema,
	sessionUpdatePlayerNameResponseSchema,
} from '@kingdom-builder/protocol';
import type {
	ActionExecuteErrorResponse,
	ActionExecuteSuccessResponse,
	SessionAdvanceResponse,
	SessionCreateResponse,
	SessionSetDevModeResponse,
	SessionStateResponse,
	SessionRunAiResponse,
	SessionUpdatePlayerNameResponse,
} from '@kingdom-builder/protocol';
import { normalizeActionTraces } from './engineTraceNormalizer.js';
import { extractRequirementFailures } from './extractRequirementFailures.js';
import type {
	SessionManager,
	CreateSessionOptions,
} from '../session/SessionManager.js';
import type { AuthMiddleware } from '../auth/tokenAuthMiddleware.js';
import { TransportError } from './TransportTypes.js';
import type {
	TransportHttpResponse,
	TransportIdFactory,
	TransportRequest,
} from './TransportTypes.js';
import {
	sanitizePlayerName,
	sanitizePlayerNameEntries,
} from './playerNameHelpers.js';
import { runAiTurnTask } from './runAiTurnTask.js';
import {
	attachHttpStatus,
	parseSessionIdentifier,
	generateSessionId,
	requireSession as ensureSession,
	applyPlayerNames,
	requireAuthorization as ensureAuthorization,
	buildStateResponse,
	buildRunAiResponse,
} from './sessionTransportInternals.js';
export { PLAYER_NAME_MAX_LENGTH } from './playerNameHelpers.js';

export interface SessionTransportOptions {
	sessionManager: SessionManager;
	idFactory?: TransportIdFactory;
	authMiddleware?: AuthMiddleware;
}

export class SessionTransport {
	private readonly sessionManager: SessionManager;

	private readonly idFactory: TransportIdFactory;

	private readonly authMiddleware: AuthMiddleware | undefined;

	public constructor(options: SessionTransportOptions) {
		this.sessionManager = options.sessionManager;
		this.idFactory = options.idFactory ?? randomUUID;
		this.authMiddleware = options.authMiddleware;
	}

	public createSession(request: TransportRequest): SessionCreateResponse {
		ensureAuthorization(this.authMiddleware, request, 'session:create');
		const parsed = sessionCreateRequestSchema.safeParse(request.body);
		if (!parsed.success) {
			throw new TransportError(
				'INVALID_REQUEST',
				'Invalid session create request.',
				{ issues: parsed.error.issues },
			);
		}
		const data = parsed.data;
		if (data.playerNames) {
			sanitizePlayerNameEntries(data.playerNames);
		}
		const sessionId = generateSessionId(this.idFactory, this.sessionManager);
		try {
			const options: CreateSessionOptions = {
				devMode: data.devMode,
			};
			if (data.config !== undefined) {
				options.config = data.config;
			}
			const session = this.sessionManager.createSession(sessionId, options);
			data.playerNames && applyPlayerNames(session, data.playerNames);
		} catch (error: unknown) {
			if (error instanceof TransportError) {
				throw error;
			}
			throw new TransportError('CONFLICT', 'Failed to create session.', {
				cause: error,
			});
		}
		const snapshot = this.sessionManager.getSnapshot(sessionId);
		const response = buildStateResponse(
			this.sessionManager,
			sessionId,
			snapshot,
		) satisfies SessionCreateResponse;
		return sessionCreateResponseSchema.parse(response);
	}
	public getSessionState(request: TransportRequest): SessionStateResponse {
		const sessionId = parseSessionIdentifier(request.body);
		ensureSession(this.sessionManager, sessionId);
		const snapshot = this.sessionManager.getSnapshot(sessionId);
		const response = buildStateResponse(
			this.sessionManager,
			sessionId,
			snapshot,
		);
		return sessionStateResponseSchema.parse(response);
	}

	public async advanceSession(
		request: TransportRequest,
	): Promise<SessionAdvanceResponse> {
		const parsed = sessionAdvanceRequestSchema.safeParse(request.body);
		if (!parsed.success) {
			throw new TransportError(
				'INVALID_REQUEST',
				'Invalid session advance request.',
				{ issues: parsed.error.issues },
			);
		}
		const { sessionId } = parsed.data;
		ensureAuthorization(this.authMiddleware, request, 'session:advance');
		const session = ensureSession(this.sessionManager, sessionId);
		try {
			const result = await session.enqueue(() => {
				const advance = session.advancePhase();
				const snapshot = this.sessionManager.getSnapshot(sessionId);
				return { advance, snapshot };
			});
			const base = buildStateResponse(
				this.sessionManager,
				sessionId,
				result.snapshot,
			);
			const response = {
				...base,
				advance: result.advance,
			} satisfies SessionAdvanceResponse;
			return sessionAdvanceResponseSchema.parse(response);
		} catch (error) {
			throw new TransportError('CONFLICT', 'Failed to advance session.', {
				cause: error,
			});
		}
	}

	public async runAiTurn(
		request: TransportRequest,
	): Promise<SessionRunAiResponse> {
		const parsed = sessionRunAiRequestSchema.safeParse(request.body);
		if (!parsed.success) {
			throw new TransportError('INVALID_REQUEST', 'Invalid AI turn request.', {
				issues: parsed.error.issues,
			});
		}
		const { sessionId, playerId, overrides } = parsed.data;
		ensureAuthorization(this.authMiddleware, request, 'session:advance');
		const session = ensureSession(this.sessionManager, sessionId);
		try {
			const result = await session.enqueue(() =>
				runAiTurnTask({
					session,
					sessionManager: this.sessionManager,
					sessionId,
					playerId,
					...(overrides !== undefined ? { overrides } : {}),
				}),
			);
			const base = buildStateResponse(
				this.sessionManager,
				sessionId,
				result.snapshot,
			);
			const response: SessionRunAiResponse =
				result.advance === undefined
					? buildRunAiResponse(base, result.ranTurn)
					: buildRunAiResponse(base, result.ranTurn, result.advance);
			return sessionRunAiResponseSchema.parse(response) as SessionRunAiResponse;
		} catch (error) {
			throw new TransportError('CONFLICT', 'Failed to run AI turn.', {
				cause: error,
			});
		}
	}

	public async executeAction(
		request: TransportRequest,
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
			return attachHttpStatus<ActionExecuteErrorResponse>(response, 400);
		}
		ensureAuthorization(this.authMiddleware, request, 'session:advance');
		const { sessionId, actionId, params } = parsed.data;
		const session = this.sessionManager.getSession(sessionId);
		if (!session) {
			const response = actionExecuteErrorResponseSchema.parse({
				status: 'error',
				error: `Session "${sessionId}" was not found.`,
			}) as ActionExecuteErrorResponse;
			return attachHttpStatus<ActionExecuteErrorResponse>(response, 404);
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
				const snapshot = this.sessionManager.getSnapshot(sessionId);
				return { traces, snapshot };
			});
			const response = actionExecuteResponseSchema.parse({
				status: 'success',
				snapshot: result.snapshot,
				costs,
				traces: normalizeActionTraces(result.traces),
			}) as ActionExecuteSuccessResponse;
			return attachHttpStatus<ActionExecuteSuccessResponse>(response, 200);
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
			return attachHttpStatus<ActionExecuteErrorResponse>(response, 409);
		}
	}

	public setDevMode(request: TransportRequest): SessionSetDevModeResponse {
		ensureAuthorization(this.authMiddleware, request, 'session:advance');
		const parsed = sessionSetDevModeRequestSchema.safeParse(request.body);
		if (!parsed.success) {
			throw new TransportError(
				'INVALID_REQUEST',
				'Invalid session dev mode request.',
				{ issues: parsed.error.issues },
			);
		}
		const { sessionId, enabled } = parsed.data;
		const session = ensureSession(this.sessionManager, sessionId);
		session.setDevMode(enabled);
		const snapshot = this.sessionManager.getSnapshot(sessionId);
		const response = buildStateResponse(
			this.sessionManager,
			sessionId,
			snapshot,
		) satisfies SessionSetDevModeResponse;
		return sessionSetDevModeResponseSchema.parse(response);
	}

	public updatePlayerName(
		request: TransportRequest,
	): SessionUpdatePlayerNameResponse {
		ensureAuthorization(this.authMiddleware, request, 'session:advance');
		const parsed = sessionUpdatePlayerNameRequestSchema.safeParse(request.body);
		if (!parsed.success) {
			throw new TransportError(
				'INVALID_REQUEST',
				'Invalid player name update request.',
				{ issues: parsed.error.issues },
			);
		}
		const { sessionId, playerId, playerName } = parsed.data;
		const sanitizedName = sanitizePlayerName(playerName);
		if (!sanitizedName) {
			throw new TransportError(
				'INVALID_REQUEST',
				'Player names must include visible characters.',
			);
		}
		const session = ensureSession(this.sessionManager, sessionId);
		session.updatePlayerName(playerId, sanitizedName);
		const snapshot = this.sessionManager.getSnapshot(sessionId);
		const response = buildStateResponse(
			this.sessionManager,
			sessionId,
			snapshot,
		) satisfies SessionUpdatePlayerNameResponse;
		return sessionUpdatePlayerNameResponseSchema.parse(response);
	}
}
