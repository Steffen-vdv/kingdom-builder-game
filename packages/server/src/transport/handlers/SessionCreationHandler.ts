import {
	sessionCreateRequestSchema,
	sessionCreateResponseSchema,
} from '@boardsmith/protocol';
import type {
	SessionCreateResponse,
	SessionPlayerId,
	SessionSnapshot,
	SessionStateResponse,
} from '@boardsmith/protocol';
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

	private readonly generateSessionId: () => Promise<string>;

	private readonly buildStateResponse: BuildStateResponse;

	public constructor(options: {
		sessionManager: SessionManager;
		generateSessionId: () => Promise<string>;
		buildStateResponse: BuildStateResponse;
	}) {
		this.sessionManager = options.sessionManager;
		this.generateSessionId = options.generateSessionId;
		this.buildStateResponse = options.buildStateResponse;
	}

	public async handle(
		context: SessionCreationContext,
	): Promise<SessionCreateResponse> {
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
		const sessionId = await this.generateSessionId();
		try {
			const options: CreateSessionOptions = {};
			if (data.contentId !== undefined) {
				options.contentId = data.contentId;
			}
			if (data.config !== undefined) {
				options.config = data.config;
			}
			const playerNames: Partial<Record<SessionPlayerId, string>> | undefined =
				sanitizedEntries?.length
					? (Object.fromEntries(sanitizedEntries) as Partial<
							Record<SessionPlayerId, string>
						>)
					: undefined;
			const session = await this.sessionManager.createSession(
				sessionId,
				options,
				playerNames,
			);
			if (sanitizedEntries) {
				for (const [playerId, name] of sanitizedEntries) {
					session.updatePlayerName(playerId, name);
				}
			}
		} catch (error) {
			throw new TransportError('CONFLICT', 'Failed to create session.', {
				cause: error,
			});
		}
		const snapshot = await this.sessionManager.getSnapshot(sessionId);
		if (!snapshot) {
			throw new TransportError(
				'NOT_FOUND',
				`Session "${sessionId}" was not found.`,
			);
		}
		return sessionCreateResponseSchema.parse(
			this.buildStateResponse(sessionId, snapshot),
		);
	}
}
