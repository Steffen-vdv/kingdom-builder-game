import { randomUUID } from 'node:crypto';
import {
	sessionCreateRequestSchema,
	sessionCreateResponseSchema,
	sessionAdvanceRequestSchema,
	sessionAdvanceResponseSchema,
	sessionSetDevModeRequestSchema,
	sessionSetDevModeResponseSchema,
	sessionIdSchema,
} from '@kingdom-builder/protocol';
import type {
	SessionAdvanceResponse,
	SessionCreateResponse,
	SessionSetDevModeResponse,
	SessionStateResponse,
} from '@kingdom-builder/protocol';
import type { EngineSession } from '@kingdom-builder/engine';
import type {
	SessionManager,
	CreateSessionOptions,
} from '../session/SessionManager.js';

type TransportIdFactory = () => string;

export type TransportErrorCode = 'INVALID_REQUEST' | 'NOT_FOUND' | 'CONFLICT';

export class TransportError extends Error {
	public readonly code: TransportErrorCode;

	public readonly issues?: unknown;

	public constructor(
		code: TransportErrorCode,
		message: string,
		options: { cause?: unknown; issues?: unknown } = {},
	) {
		super(message);
		this.code = code;
		this.issues = options.issues;
		if (options.cause) {
			this.cause = options.cause;
		}
	}
}

export interface SessionTransportOptions {
	sessionManager: SessionManager;
	idFactory?: TransportIdFactory;
}

export class SessionTransport {
	private readonly sessionManager: SessionManager;

	private readonly idFactory: TransportIdFactory;

	public constructor(options: SessionTransportOptions) {
		this.sessionManager = options.sessionManager;
		this.idFactory = options.idFactory ?? randomUUID;
	}

	public createSession(request: unknown): SessionCreateResponse {
		const parsed = sessionCreateRequestSchema.safeParse(request);
		if (!parsed.success) {
			throw new TransportError(
				'INVALID_REQUEST',
				'Invalid session create request.',
				{ issues: parsed.error.issues },
			);
		}
		const data = parsed.data;
		const sessionId = this.generateSessionId();
		try {
			const options: CreateSessionOptions = {
				devMode: data.devMode,
			};
			if (data.config !== undefined) {
				options.config = data.config;
			}
			const session = this.sessionManager.createSession(sessionId, options);
			if (data.playerNames) {
				this.applyPlayerNames(session, data.playerNames);
			}
		} catch (error) {
			throw new TransportError('CONFLICT', 'Failed to create session.', {
				cause: error,
			});
		}
		const response = {
			sessionId,
			snapshot: this.sessionManager.getSnapshot(sessionId),
		} satisfies SessionCreateResponse;
		return sessionCreateResponseSchema.parse(response);
	}

	public getSessionState(request: unknown): SessionStateResponse {
		const sessionId = this.parseSessionIdentifier(request);
		this.requireSession(sessionId);
		const snapshot = this.sessionManager.getSnapshot(sessionId);
		const response = { sessionId, snapshot } satisfies SessionStateResponse;
		return sessionCreateResponseSchema.parse(response);
	}

	public advanceSession(request: unknown): SessionAdvanceResponse {
		const parsed = sessionAdvanceRequestSchema.safeParse(request);
		if (!parsed.success) {
			throw new TransportError(
				'INVALID_REQUEST',
				'Invalid session advance request.',
				{ issues: parsed.error.issues },
			);
		}
		const { sessionId } = parsed.data;
		const session = this.requireSession(sessionId);
		const advance = session.advancePhase();
		const response = {
			sessionId,
			snapshot: this.sessionManager.getSnapshot(sessionId),
			advance,
		} satisfies SessionAdvanceResponse;
		return sessionAdvanceResponseSchema.parse(response);
	}

	public setDevMode(request: unknown): SessionSetDevModeResponse {
		const parsed = sessionSetDevModeRequestSchema.safeParse(request);
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
		const response = {
			sessionId,
			snapshot: this.sessionManager.getSnapshot(sessionId),
		} satisfies SessionSetDevModeResponse;
		return sessionSetDevModeResponseSchema.parse(response);
	}

	private parseSessionIdentifier(request: unknown): string {
		const parsed = sessionIdSchema.safeParse(
			(request as { sessionId?: unknown })?.sessionId,
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

	private applyPlayerNames(
		session: EngineSession,
		names: Record<string, string>,
	): void {
		const context = session.getLegacyContext();
		for (const player of context.game.players) {
			const name = names[player.id];
			if (name) {
				player.name = name;
			}
		}
	}
}
