import { randomUUID } from 'node:crypto';
import {
	actionExecuteRequestSchema,
	actionExecuteResponseSchema,
	actionExecuteErrorResponseSchema,
	sessionCreateRequestSchema,
	sessionCreateResponseSchema,
	sessionAdvanceRequestSchema,
	sessionAdvanceResponseSchema,
	sessionSetDevModeRequestSchema,
	sessionSetDevModeResponseSchema,
	sessionIdSchema,
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
	SessionSnapshot,
	SessionUpdatePlayerNameResponse,
} from '@kingdom-builder/protocol';
import type { EngineSession } from '@kingdom-builder/engine';
import { normalizeActionTraces } from './engineTraceNormalizer.js';
import { extractRequirementFailures } from './extractRequirementFailures.js';
import type {
	SessionManager,
	CreateSessionOptions,
} from '../session/SessionManager.js';
import type { AuthContext, AuthRole } from '../auth/AuthContext.js';
import { AuthError } from '../auth/AuthError.js';
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
	type SanitizedPlayerNameEntry,
} from './playerNameHelpers.js';
import { parseActionParameters } from './actionParameterHelpers.js';
export { PLAYER_NAME_MAX_LENGTH } from './playerNameHelpers.js';
export interface SessionTransportOptions {
	sessionManager: SessionManager;
	idFactory?: TransportIdFactory;
	authMiddleware?: AuthMiddleware;
}
export class SessionTransportBase {
	protected readonly sessionManager: SessionManager;
	protected readonly idFactory: TransportIdFactory;
	protected readonly authMiddleware: AuthMiddleware | undefined;
	public constructor(options: SessionTransportOptions) {
		this.sessionManager = options.sessionManager;
		this.idFactory = options.idFactory ?? randomUUID;
		this.authMiddleware = options.authMiddleware;
	}

	public createSession(request: TransportRequest): SessionCreateResponse {
		this.requireAuthorization(request, 'session:create');
		const parsed = sessionCreateRequestSchema.safeParse(request.body);
		if (!parsed.success) {
			throw new TransportError(
				'INVALID_REQUEST',
				'Invalid session create request.',
				{ issues: parsed.error.issues },
			);
		}
		const data = parsed.data;
		let sanitizedEntries: SanitizedPlayerNameEntry[] | undefined;
		if (data.playerNames) {
			sanitizedEntries = sanitizePlayerNameEntries(data.playerNames);
		}
		const sessionId = this.generateSessionId();
		try {
			const options: CreateSessionOptions = {
				devMode: data.devMode,
			};
			if (data.config !== undefined) {
				options.config = data.config;
			}
			const session = this.sessionManager.createSession(sessionId, options);
			if (sanitizedEntries && sanitizedEntries.length > 0) {
				for (const [playerId, sanitizedName] of sanitizedEntries) {
					session.updatePlayerName(playerId, sanitizedName);
				}
			}
		} catch (error) {
			throw new TransportError('CONFLICT', 'Failed to create session.', {
				cause: error,
			});
		}
		const snapshot = this.sessionManager.getSnapshot(sessionId);
		return sessionCreateResponseSchema.parse(
			this.buildStateResponse(sessionId, snapshot),
		);
	}

	public getSessionState(request: TransportRequest): SessionStateResponse {
		const sessionId = this.parseSessionIdentifier(request.body);
		this.requireSession(sessionId);
		const snapshot = this.sessionManager.getSnapshot(sessionId);
		return sessionStateResponseSchema.parse(
			this.buildStateResponse(sessionId, snapshot),
		);
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
		this.requireAuthorization(request, 'session:advance');
		const session = this.requireSession(sessionId);
		try {
			const result = await session.enqueue(() => {
				const advance = session.advancePhase();
				const snapshot = session.getSnapshot();
				return { advance, snapshot };
			});
			const base = this.buildStateResponse(sessionId, result.snapshot);
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
			return this.attachHttpStatus<ActionExecuteErrorResponse>(response, 400);
		}
		this.requireAuthorization(request, 'session:advance');
		const { sessionId, actionId, params } = parsed.data;
		const normalizedParams = parseActionParameters(
			params,
			'Invalid action request.',
		);
		const session = this.sessionManager.getSession(sessionId);
		if (!session) {
			const response = actionExecuteErrorResponseSchema.parse({
				status: 'error',
				error: `Session "${sessionId}" was not found.`,
			}) as ActionExecuteErrorResponse;
			return this.attachHttpStatus<ActionExecuteErrorResponse>(response, 404);
		}
		try {
			const rawCosts = session.getActionCosts(actionId, normalizedParams);
			const costs: Record<string, number> = {};
			for (const [resourceKey, amount] of Object.entries(rawCosts)) {
				if (typeof amount === 'number') {
					costs[resourceKey] = amount;
				}
			}
			const result = await session.enqueue(() => {
				const traces = session.performAction(actionId, normalizedParams);
				const snapshot = session.getSnapshot();
				return { traces, snapshot };
			});
			const response = actionExecuteResponseSchema.parse({
				status: 'success',
				snapshot: result.snapshot,
				costs,
				traces: normalizeActionTraces(result.traces),
			}) as ActionExecuteSuccessResponse;
			return this.attachHttpStatus<ActionExecuteSuccessResponse>(response, 200);
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
			return this.attachHttpStatus<ActionExecuteErrorResponse>(response, 409);
		}
	}

	public setDevMode(request: TransportRequest): SessionSetDevModeResponse {
		this.requireAuthorization(request, 'session:advance');
		const parsed = sessionSetDevModeRequestSchema.safeParse(request.body);
		if (!parsed.success) {
			throw new TransportError(
				'INVALID_REQUEST',
				'Invalid session dev mode request.',
				{ issues: parsed.error.issues },
			);
		}
		const { sessionId, enabled } = parsed.data;
		const session = this.requireSession(sessionId);
		session.setDevMode(enabled);
		const snapshot = this.sessionManager.getSnapshot(sessionId);
		return sessionSetDevModeResponseSchema.parse(
			this.buildStateResponse(sessionId, snapshot),
		);
	}

	public updatePlayerName(
		request: TransportRequest,
	): SessionUpdatePlayerNameResponse {
		this.requireAuthorization(request, 'session:advance');
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
		const session = this.requireSession(sessionId);
		session.updatePlayerName(playerId, sanitizedName);
		const snapshot = this.sessionManager.getSnapshot(sessionId);
		return sessionUpdatePlayerNameResponseSchema.parse(
			this.buildStateResponse(sessionId, snapshot),
		);
	}
	protected attachHttpStatus<T extends object>(
		payload: T,
		status: number,
	): TransportHttpResponse<T> {
		Object.defineProperty(payload, 'httpStatus', {
			value: status,
			enumerable: false,
		});
		return payload as TransportHttpResponse<T>;
	}
	protected parseSessionIdentifier(body: unknown): string {
		const parsed = sessionIdSchema.safeParse(
			(body as { sessionId?: unknown })?.sessionId,
		);
		if (!parsed.success) {
			throw new TransportError(
				'INVALID_REQUEST',
				'Invalid session identifier.',
				{ issues: parsed.error.issues },
			);
		}
		return parsed.data;
	}
	protected generateSessionId(): string {
		let attempts = 0;
		while (attempts < 10) {
			const sessionId = this.idFactory();
			if (!this.sessionManager.getSession(sessionId)) {
				return sessionId;
			}
			attempts += 1;
		}
		throw new TransportError(
			'CONFLICT',
			'Failed to generate a unique session identifier.',
		);
	}
	protected requireSession(sessionId: string): EngineSession {
		const session = this.sessionManager.getSession(sessionId);
		if (!session) {
			throw new TransportError(
				'NOT_FOUND',
				`Session "${sessionId}" was not found.`,
			);
		}
		return session;
	}
	protected requireAuthorization(
		request: TransportRequest,
		role: AuthRole,
	): AuthContext {
		if (!this.authMiddleware) {
			throw new TransportError(
				'UNAUTHORIZED',
				'Authorization middleware is not configured.',
			);
		}
		try {
			const context = this.authMiddleware(request);
			if (!this.hasRole(context, role)) {
				throw new AuthError('FORBIDDEN', `Missing required role "${role}".`);
			}
			return context;
		} catch (error) {
			if (error instanceof AuthError) {
				throw new TransportError(error.code, error.message, {
					cause: error,
				});
			}
			throw error;
		}
	}
	protected hasRole(context: AuthContext, role: AuthRole): boolean {
		if (context.roles.includes(role)) {
			return true;
		}
		return context.roles.includes('admin');
	}
	protected buildStateResponse(
		sessionId: string,
		snapshot: SessionSnapshot,
	): SessionStateResponse {
		return {
			sessionId,
			snapshot,
			registries: this.sessionManager.getRegistries(),
		};
	}
}
