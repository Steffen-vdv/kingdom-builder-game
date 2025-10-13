import {
	sessionCreateRequestSchema,
	sessionCreateResponseSchema,
	sessionAdvanceRequestSchema,
	sessionAdvanceResponseSchema,
} from '@kingdom-builder/protocol';
import type {
	SessionCreateResponse,
	SessionAdvanceResponse,
	SessionSnapshot,
	SessionPlayerNameMap,
	SessionStateResponse,
} from '@kingdom-builder/protocol';
import type { EngineSession } from '@kingdom-builder/engine';
import { TransportError } from './TransportTypes.js';
import type { TransportRequest } from './TransportTypes.js';
import type { CreateSessionOptions } from '../session/SessionManager.js';

interface CreateSessionDependencies {
	generateSessionId(): string;
	createSession(
		sessionId: string,
		options: CreateSessionOptions,
	): EngineSession;
	applyPlayerNames(
		session: EngineSession,
		names: SessionPlayerNameMap | undefined,
	): void;
	getSnapshot(sessionId: string): SessionSnapshot;
	buildStateResponse(
		sessionId: string,
		snapshot: SessionSnapshot,
	): SessionStateResponse;
}

interface AdvanceSessionDependencies {
	requireSession(sessionId: string): EngineSession;
	buildStateResponse(
		sessionId: string,
		snapshot: SessionSnapshot,
	): SessionStateResponse;
}

export function handleCreateSession(
	request: TransportRequest,
	deps: CreateSessionDependencies,
): SessionCreateResponse {
	const parsed = sessionCreateRequestSchema.safeParse(request.body);
	if (!parsed.success) {
		throw new TransportError(
			'INVALID_REQUEST',
			'Invalid session create request.',
			{ issues: parsed.error.issues },
		);
	}
	const data = parsed.data;
	const sessionId = deps.generateSessionId();
	try {
		const options: CreateSessionOptions = {
			devMode: data.devMode,
		};
		if (data.config !== undefined) {
			options.config = data.config;
		}
		const session = deps.createSession(sessionId, options);
		if (data.playerNames) {
			deps.applyPlayerNames(session, data.playerNames);
		}
	} catch (error) {
		throw new TransportError('CONFLICT', 'Failed to create session.', {
			cause: error,
		});
	}
	const snapshot = deps.getSnapshot(sessionId);
	const response = deps.buildStateResponse(sessionId, snapshot);
	return sessionCreateResponseSchema.parse(response);
}

export async function handleAdvanceSession(
	request: TransportRequest,
	deps: AdvanceSessionDependencies,
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
	const session = deps.requireSession(sessionId);
	try {
		const result = await session.enqueue(() => {
			const advance = session.advancePhase();
			const snapshot = session.getSnapshot();
			return { advance, snapshot };
		});
		const base = deps.buildStateResponse(sessionId, result.snapshot);
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
