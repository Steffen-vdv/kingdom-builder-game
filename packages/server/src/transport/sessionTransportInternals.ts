import type { EngineSession } from '@kingdom-builder/engine';
import type {
	SessionPlayerNameMap,
	SessionSnapshot,
	SessionStateResponse,
	SessionRunAiResponse,
	SessionAdvanceResult,
} from '@kingdom-builder/protocol';
import { sessionIdSchema } from '@kingdom-builder/protocol';
import type { AuthContext, AuthRole } from '../auth/AuthContext.js';
import type { AuthMiddleware } from '../auth/tokenAuthMiddleware.js';
import { AuthError } from '../auth/AuthError.js';
import type { SessionManager } from '../session/SessionManager.js';
import { sanitizePlayerNameEntries } from './playerNameHelpers.js';
import { TransportError } from './TransportTypes.js';
import type {
	TransportHttpResponse,
	TransportIdFactory,
	TransportRequest,
} from './TransportTypes.js';

export function attachHttpStatus<T extends object>(
	payload: T,
	status: number,
): TransportHttpResponse<T> {
	Object.defineProperty(payload, 'httpStatus', {
		value: status,
		enumerable: false,
	});
	return payload as TransportHttpResponse<T>;
}

export function parseSessionIdentifier(body: unknown): string {
	const parsed = sessionIdSchema.safeParse(
		(body as { sessionId?: unknown })?.sessionId,
	);
	if (!parsed.success) {
		throw new TransportError('INVALID_REQUEST', 'Invalid session identifier.', {
			issues: parsed.error.issues,
		});
	}
	return parsed.data;
}

export function generateSessionId(
	idFactory: TransportIdFactory,
	sessionManager: SessionManager,
): string {
	let attempts = 0;
	while (attempts < 10) {
		const sessionId = idFactory();
		if (!sessionManager.getSession(sessionId)) {
			return sessionId;
		}
		attempts += 1;
	}
	throw new TransportError(
		'CONFLICT',
		'Failed to generate a unique session identifier.',
	);
}

export function requireSession(
	sessionManager: SessionManager,
	sessionId: string,
): EngineSession {
	const session = sessionManager.getSession(sessionId);
	if (!session) {
		throw new TransportError(
			'NOT_FOUND',
			`Session "${sessionId}" was not found.`,
		);
	}
	return session;
}

export function applyPlayerNames(
	session: EngineSession,
	names: SessionPlayerNameMap,
): void {
	const entries = sanitizePlayerNameEntries(names);
	for (const [playerId, sanitizedName] of entries) {
		session.updatePlayerName(playerId, sanitizedName);
	}
}

export function requireAuthorization(
	authMiddleware: AuthMiddleware | undefined,
	request: TransportRequest,
	role: AuthRole,
): AuthContext {
	if (!authMiddleware) {
		throw new TransportError(
			'UNAUTHORIZED',
			'Authorization middleware is not configured.',
		);
	}
	try {
		const context = authMiddleware(request);
		if (!hasRole(context, role)) {
			throw new AuthError('FORBIDDEN', `Missing required role "${role}".`);
		}
		return context;
	} catch (error: unknown) {
		if (error instanceof AuthError) {
			throw new TransportError(error.code, error.message, {
				cause: error,
			});
		}
		if (error instanceof TransportError) {
			throw error;
		}
		if (error instanceof Error) {
			throw error;
		}
		throw new TransportError(
			'UNAUTHORIZED',
			'Authorization middleware failed.',
			{ cause: error },
		);
	}
}

function hasRole(context: AuthContext, role: AuthRole): boolean {
	if (context.roles.includes(role)) {
		return true;
	}
	return context.roles.includes('admin');
}

export function buildStateResponse(
	sessionManager: SessionManager,
	sessionId: string,
	snapshot: SessionSnapshot,
): SessionStateResponse {
	return {
		sessionId,
		snapshot,
		registries: sessionManager.getRegistries(),
	};
}

export function buildRunAiResponse(
	base: SessionStateResponse,
	ranTurn: boolean,
	advance?: SessionAdvanceResult,
): SessionRunAiResponse {
	return {
		...base,
		ranTurn,
		...(advance === undefined ? {} : { advance }),
	} as SessionRunAiResponse;
}
