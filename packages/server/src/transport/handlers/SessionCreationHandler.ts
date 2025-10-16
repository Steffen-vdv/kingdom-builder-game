import {
	sessionCreateRequestSchema,
	sessionCreateResponseSchema,
} from '@kingdom-builder/protocol';
import type {
	SessionCreateResponse,
	SessionSnapshot,
	SessionStateResponse,
} from '@kingdom-builder/protocol';
import type { TransportRequest } from '../TransportTypes.js';
import { TransportError } from '../TransportTypes.js';
import type { AuthContext, AuthRole } from '../../auth/AuthContext.js';
import type {
	SessionManager,
	CreateSessionOptions,
} from '../../session/SessionManager.js';
import {
	sanitizePlayerNameEntries,
	type SanitizedPlayerNameEntry,
} from '../playerNameHelpers.js';

type AuthorizationCallback = (role: AuthRole) => AuthContext;

type BuildStateResponse = (
	sessionId: string,
	snapshot: SessionSnapshot,
) => SessionStateResponse;

interface SessionCreationContext {
	request: TransportRequest;
	requireAuthorization: AuthorizationCallback;
}

export class SessionCreationHandler {
	private readonly sessionManager: SessionManager;

	private readonly generateSessionId: () => string;

	private readonly buildStateResponse: BuildStateResponse;

	public constructor(options: {
		sessionManager: SessionManager;
		generateSessionId: () => string;
		buildStateResponse: BuildStateResponse;
	}) {
		this.sessionManager = options.sessionManager;
		this.generateSessionId = options.generateSessionId;
		this.buildStateResponse = options.buildStateResponse;
	}

	public handle(context: SessionCreationContext): SessionCreateResponse {
		context.requireAuthorization('session:create');
		const parsed = sessionCreateRequestSchema.safeParse(context.request.body);
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
}
