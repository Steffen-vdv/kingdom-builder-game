import {
	sessionAdvanceRequestSchema,
	sessionAdvanceResponseSchema,
} from '@kingdom-builder/protocol';
import type {
	SessionAdvanceResponse,
	SessionSnapshot,
	SessionStateResponse,
} from '@kingdom-builder/protocol';
import type { EngineSession } from '@kingdom-builder/engine';
import type { TransportRequest } from '../TransportTypes.js';
import { TransportError } from '../TransportTypes.js';
import type { AuthContext, AuthRole } from '../../auth/AuthContext.js';

type AuthorizationCallback = (role: AuthRole) => AuthContext;

type RequireSession = (sessionId: string) => EngineSession;

type BuildStateResponse = (
	sessionId: string,
	snapshot: SessionSnapshot,
) => SessionStateResponse;

interface SessionAdvanceContext {
	request: TransportRequest;
	requireAuthorization: AuthorizationCallback;
}

export class SessionAdvanceHandler {
	private readonly requireSession: RequireSession;

	private readonly buildStateResponse: BuildStateResponse;

	public constructor(options: {
		requireSession: RequireSession;
		buildStateResponse: BuildStateResponse;
	}) {
		this.requireSession = options.requireSession;
		this.buildStateResponse = options.buildStateResponse;
	}

	public async handle(
		context: SessionAdvanceContext,
	): Promise<SessionAdvanceResponse> {
		context.requireAuthorization('session:advance');
		const parsed = sessionAdvanceRequestSchema.safeParse(context.request.body);
		if (!parsed.success) {
			throw new TransportError(
				'INVALID_REQUEST',
				'Invalid session advance request.',
				{ issues: parsed.error.issues },
			);
		}
		const { sessionId } = parsed.data;
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
}
