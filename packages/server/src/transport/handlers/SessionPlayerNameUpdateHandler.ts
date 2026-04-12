import {
	sessionUpdatePlayerNameRequestSchema,
	sessionUpdatePlayerNameResponseSchema,
} from '@boardsmith/protocol';
import type {
	SessionPlayerId,
	SessionSnapshot,
	SessionStateResponse,
	SessionUpdatePlayerNameResponse,
} from '@boardsmith/protocol';
import type { EngineSession } from '@boardsmith/engine';
import type { TransportRequest } from '../TransportTypes.js';
import { TransportError } from '../TransportTypes.js';
import type { AuthContext, AuthRole } from '../../auth/AuthContext.js';
import { sanitizePlayerName } from '../playerNameHelpers.js';

type AuthorizationCallback = (role: AuthRole) => AuthContext;

type RequireSession = (sessionId: string) => Promise<EngineSession>;

type BuildStateResponse = (
	sessionId: string,
	snapshot: SessionSnapshot,
) => SessionStateResponse;

type RecordPlayerNameChange = (
	sessionId: string,
	playerId: SessionPlayerId,
	name: string,
) => void;

interface SessionPlayerNameContext {
	request: TransportRequest;
	requireAuthorization: AuthorizationCallback;
}

export class SessionPlayerNameUpdateHandler {
	private readonly requireSession: RequireSession;

	private readonly buildStateResponse: BuildStateResponse;

	private readonly recordPlayerNameChange: RecordPlayerNameChange;

	public constructor(options: {
		requireSession: RequireSession;
		buildStateResponse: BuildStateResponse;
		recordPlayerNameChange: RecordPlayerNameChange;
	}) {
		this.requireSession = options.requireSession;
		this.buildStateResponse = options.buildStateResponse;
		this.recordPlayerNameChange = options.recordPlayerNameChange;
	}

	public async handle(
		context: SessionPlayerNameContext,
	): Promise<SessionUpdatePlayerNameResponse> {
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
		const session = await this.requireSession(sessionId);
		session.updatePlayerName(playerId, sanitizedName);
		// Record the player name change for persistence
		this.recordPlayerNameChange(sessionId, playerId, sanitizedName);
		const snapshot = session.getSnapshot();
		return sessionUpdatePlayerNameResponseSchema.parse(
			this.buildStateResponse(sessionId, snapshot),
		);
	}
}
