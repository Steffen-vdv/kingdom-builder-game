import {
	sessionUpdatePlayerNameRequestSchema,
	sessionUpdatePlayerNameResponseSchema,
} from '@kingdom-builder/protocol';
import type {
	SessionSnapshot,
	SessionStateResponse,
	SessionUpdatePlayerNameResponse,
} from '@kingdom-builder/protocol';
import type { EngineSession } from '@kingdom-builder/engine';
import type { TransportRequest } from '../TransportTypes.js';
import { TransportError } from '../TransportTypes.js';
import type { AuthContext, AuthRole } from '../../auth/AuthContext.js';
import { sanitizePlayerName } from '../playerNameHelpers.js';

type AuthorizationCallback = (role: AuthRole) => AuthContext;

type RequireSession = (sessionId: string) => EngineSession;

type BuildStateResponse = (
	sessionId: string,
	snapshot: SessionSnapshot,
) => SessionStateResponse;

interface SessionPlayerNameContext {
	request: TransportRequest;
	requireAuthorization: AuthorizationCallback;
}

export class SessionPlayerNameUpdateHandler {
	private readonly requireSession: RequireSession;

	private readonly buildStateResponse: BuildStateResponse;

	public constructor(options: {
		requireSession: RequireSession;
		buildStateResponse: BuildStateResponse;
	}) {
		this.requireSession = options.requireSession;
		this.buildStateResponse = options.buildStateResponse;
	}

	public handle(
		context: SessionPlayerNameContext,
	): SessionUpdatePlayerNameResponse {
		context.requireAuthorization('session:advance');
		const parsed = sessionUpdatePlayerNameRequestSchema.safeParse(
			context.request.body,
		);
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
		const snapshot = session.getSnapshot();
		return sessionUpdatePlayerNameResponseSchema.parse(
			this.buildStateResponse(sessionId, snapshot),
		);
	}
}
