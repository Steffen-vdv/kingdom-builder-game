import { randomUUID } from 'node:crypto';
import {
	sessionSetDevModeRequestSchema,
	sessionSetDevModeResponseSchema,
	sessionIdSchema,
	sessionStateResponseSchema,
	runtimeConfigResponseSchema,
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
	SessionRuntimeConfigResponse,
} from '@kingdom-builder/protocol';
import type { EngineSession } from '@kingdom-builder/engine';
import type { SessionManager } from '../session/SessionManager.js';
import { mergeSessionMetadata } from '../session/mergeSessionMetadata.js';
import type { AuthContext, AuthRole } from '../auth/AuthContext.js';
import { AuthError } from '../auth/AuthError.js';
import type { AuthMiddleware } from '../auth/tokenAuthMiddleware.js';
import { TransportError } from './TransportTypes.js';
import type {
	TransportHttpResponse,
	TransportIdFactory,
	TransportRequest,
} from './TransportTypes.js';
import { SessionCreationHandler } from './handlers/SessionCreationHandler.js';
import { SessionAdvanceHandler } from './handlers/SessionAdvanceHandler.js';
import { SessionActionExecutionHandler } from './handlers/SessionActionExecutionHandler.js';
import { SessionPlayerNameUpdateHandler } from './handlers/SessionPlayerNameUpdateHandler.js';
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

	private readonly sessionCreationHandler: SessionCreationHandler;

	private readonly sessionAdvanceHandler: SessionAdvanceHandler;

	private readonly sessionActionExecutionHandler: SessionActionExecutionHandler;

	private readonly sessionPlayerNameHandler: SessionPlayerNameUpdateHandler;

	public constructor(options: SessionTransportOptions) {
		this.sessionManager = options.sessionManager;
		this.idFactory = options.idFactory ?? randomUUID;
		this.authMiddleware = options.authMiddleware;
		this.sessionCreationHandler = new SessionCreationHandler({
			sessionManager: this.sessionManager,
			generateSessionId: this.generateSessionId.bind(this),
			buildStateResponse: this.buildStateResponse.bind(this),
		});
		this.sessionAdvanceHandler = new SessionAdvanceHandler({
			requireSession: this.requireSession.bind(this),
			buildStateResponse: this.buildStateResponse.bind(this),
			recordAdvance: (sessionId) =>
				this.sessionManager.recordAdvance(sessionId),
		});
		this.sessionActionExecutionHandler = new SessionActionExecutionHandler({
			sessionManager: this.sessionManager,
			attachHttpStatus: this.attachHttpStatus.bind(this),
		});
		this.sessionPlayerNameHandler = new SessionPlayerNameUpdateHandler({
			requireSession: this.requireSession.bind(this),
			buildStateResponse: this.buildStateResponse.bind(this),
			recordPlayerNameChange: (sessionId, playerId, name) =>
				this.sessionManager.recordPlayerNameChange(sessionId, playerId, name),
		});
	}

	public async createSession(
		request: TransportRequest,
	): Promise<SessionCreateResponse> {
		return this.sessionCreationHandler.handle({
			request,
			requireAuthorization: (role) => this.requireAuthorization(request, role),
		});
	}

	public async getSessionState(
		request: TransportRequest,
	): Promise<SessionStateResponse> {
		const sessionId = this.parseSessionIdentifier(request.body);
		this.requireAuthorization(request, 'session:advance');
		await this.requireSession(sessionId);
		const snapshot = await this.sessionManager.getSnapshot(sessionId);
		if (!snapshot) {
			throw new TransportError(
				'NOT_FOUND',
				`Session "${sessionId}" was not found.`,
			);
		}
		return sessionStateResponseSchema.parse(
			this.buildStateResponse(sessionId, snapshot),
		);
	}

	public async advanceSession(
		request: TransportRequest,
	): Promise<SessionAdvanceResponse> {
		return this.sessionAdvanceHandler.handle({
			request,
			requireAuthorization: (role) => this.requireAuthorization(request, role),
		});
	}

	public async executeAction(
		request: TransportRequest,
	): Promise<
		| TransportHttpResponse<ActionExecuteSuccessResponse>
		| TransportHttpResponse<ActionExecuteErrorResponse>
	> {
		return this.sessionActionExecutionHandler.handle({
			request,
			requireAuthorization: (role) => this.requireAuthorization(request, role),
		});
	}

	public async setDevMode(
		request: TransportRequest,
	): Promise<SessionSetDevModeResponse> {
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
		const session = await this.requireSession(sessionId);
		session.setDevMode(enabled);
		// Record the dev mode change for persistence
		this.sessionManager.recordDevModeChange(sessionId, enabled);
		const snapshot = await this.sessionManager.getSnapshot(sessionId);
		if (!snapshot) {
			throw new TransportError(
				'NOT_FOUND',
				`Session "${sessionId}" was not found.`,
			);
		}
		return sessionSetDevModeResponseSchema.parse(
			this.buildStateResponse(sessionId, snapshot),
		);
	}

	public async updatePlayerName(
		request: TransportRequest,
	): Promise<SessionUpdatePlayerNameResponse> {
		return this.sessionPlayerNameHandler.handle({
			request,
			requireAuthorization: (role) => this.requireAuthorization(request, role),
		});
	}

	public getRuntimeConfig(): SessionRuntimeConfigResponse {
		return runtimeConfigResponseSchema.parse(
			this.sessionManager.getRuntimeConfig(),
		);
	}

	/**
	 * Public authorization check for use in Fastify routes.
	 * Converts a Fastify request-like object to a TransportRequest.
	 */
	public requireAuthorizationPublic(
		request: { headers: Record<string, string | string[] | undefined> },
		role: AuthRole,
	): AuthContext {
		const headers: Record<string, string | undefined> = {};
		for (const [key, value] of Object.entries(request.headers)) {
			if (typeof value === 'string') {
				headers[key] = value;
			} else if (Array.isArray(value) && value.length > 0) {
				headers[key] = value[value.length - 1];
			}
		}
		return this.requireAuthorization({ body: {}, headers }, role);
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
	protected async generateSessionId(): Promise<string> {
		let attempts = 0;
		while (attempts < 10) {
			const sessionId = this.idFactory();
			if (!(await this.sessionManager.getSession(sessionId))) {
				return sessionId;
			}
			attempts += 1;
		}
		throw new TransportError(
			'CONFLICT',
			'Failed to generate a unique session identifier.',
		);
	}
	protected async requireSession(sessionId: string): Promise<EngineSession> {
		const session = await this.sessionManager.getSession(sessionId);
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
		const metadata = this.sessionManager.getSessionMetadata(sessionId);
		const registries = this.sessionManager.getSessionRegistries(sessionId);
		if (!metadata || !registries) {
			throw new TransportError(
				'NOT_FOUND',
				`Session "${sessionId}" was not found.`,
			);
		}
		const clonedSnapshot = structuredClone(snapshot);
		clonedSnapshot.metadata = mergeSessionMetadata({
			baseMetadata: metadata,
			snapshotMetadata: clonedSnapshot.metadata,
		});
		return {
			sessionId,
			snapshot: clonedSnapshot,
			registries,
		};
	}
}
