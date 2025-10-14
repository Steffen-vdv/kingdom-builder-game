import { randomUUID } from 'node:crypto';
import {
	actionExecuteRequestSchema,
	actionExecuteErrorResponseSchema,
	sessionCreateRequestSchema,
	sessionCreateResponseSchema,
	sessionAdvanceRequestSchema,
	sessionAdvanceResponseSchema,
	sessionRunAiRequestSchema,
	sessionRunAiResponseSchema,
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
	SessionCreateRequest,
	SessionCreateResponse,
	SessionSetDevModeResponse,
	SessionStateResponse,
	SessionSnapshot,
	SessionRunAiResponse,
	SessionUpdatePlayerNameResponse,
} from '@kingdom-builder/protocol';
import type { EngineSession } from '@kingdom-builder/engine';
import type { SessionManager } from '../session/SessionManager.js';
import type { AuthContext, AuthRole } from '../auth/AuthContext.js';
import { AuthError } from '../auth/AuthError.js';
import type { AuthMiddleware } from '../auth/tokenAuthMiddleware.js';
import { TransportError } from './TransportTypes.js';
import type {
	TransportHttpResponse,
	TransportIdFactory,
	TransportRequest,
} from './TransportTypes.js';
import { sanitizePlayerName } from './playerNameHelpers.js';
import { runSessionAiTurn } from './runAiTurn.js';
import { executeSessionAction } from './executeAction.js';
import { createSessionCore } from './createSession.js';
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
		this.requireAuthorization(request, 'session:create');
		const parsed = sessionCreateRequestSchema.safeParse(request.body);
		if (!parsed.success) {
			throw new TransportError(
				'INVALID_REQUEST',
				'Invalid session create request.',
				{ issues: parsed.error.issues },
			);
		}
		const { devMode, config, playerNames } = parsed.data;
		const requestData: SessionCreateRequest = {
			...(devMode !== undefined ? { devMode } : {}),
			...(config !== undefined ? { config } : {}),
			...(playerNames !== undefined ? { playerNames } : {}),
		};
		const result = createSessionCore({
			sessionManager: this.sessionManager,
			generateId: () => this.generateSessionId(),
			request: requestData,
		});
		return sessionCreateResponseSchema.parse(
			this.buildStateResponse(result.sessionId, result.snapshot),
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
				const snapshot = this.sessionManager.getSnapshot(sessionId);
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

	public async runAiTurn(
		request: TransportRequest,
	): Promise<SessionRunAiResponse> {
		const parsed = sessionRunAiRequestSchema.safeParse(request.body);
		if (!parsed.success) {
			throw new TransportError(
				'INVALID_REQUEST',
				'Invalid session AI request.',
				{ issues: parsed.error.issues },
			);
		}
		this.requireAuthorization(request, 'session:advance');
		const { sessionId, playerId } = parsed.data;
		const session = this.requireSession(sessionId);
		try {
			const result = await session.enqueue(() =>
				runSessionAiTurn(session, this.sessionManager, playerId),
			);
			const base = this.buildStateResponse(sessionId, result.snapshot);
			const { advance } = result;
			const response = {
				...base,
				ranTurn: result.ranTurn,
				...(advance !== undefined ? { advance } : {}),
			};
			return sessionRunAiResponseSchema.parse(response);
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
			return this.attachHttpStatus<ActionExecuteErrorResponse>(response, 400);
		}
		this.requireAuthorization(request, 'session:advance');
		const { sessionId, actionId, params } = parsed.data;
		const session = this.sessionManager.getSession(sessionId);
		if (!session) {
			const response = actionExecuteErrorResponseSchema.parse({
				status: 'error',
				error: `Session "${sessionId}" was not found.`,
			}) as ActionExecuteErrorResponse;
			return this.attachHttpStatus<ActionExecuteErrorResponse>(response, 404);
		}
		return executeSessionAction(
			{
				session,
				sessionManager: this.sessionManager,
				sessionId,
				actionId,
				params,
			},
			(payload, status) => this.attachHttpStatus(payload, status),
		);
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

	private attachHttpStatus<T extends object>(
		payload: T,
		status: number,
	): TransportHttpResponse<T> {
		Object.defineProperty(payload, 'httpStatus', {
			value: status,
			enumerable: false,
		});
		return payload as TransportHttpResponse<T>;
	}

	private parseSessionIdentifier(body: unknown): string {
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

	private generateSessionId(): string {
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

	private requireSession(sessionId: string): EngineSession {
		const session = this.sessionManager.getSession(sessionId);
		if (!session) {
			throw new TransportError(
				'NOT_FOUND',
				`Session "${sessionId}" was not found.`,
			);
		}
		return session;
	}

	private requireAuthorization(
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

	private hasRole(context: AuthContext, role: AuthRole): boolean {
		if (context.roles.includes(role)) {
			return true;
		}
		return context.roles.includes('admin');
	}

	private buildStateResponse(
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
