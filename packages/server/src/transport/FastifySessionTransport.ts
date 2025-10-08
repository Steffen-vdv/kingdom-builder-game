import Fastify, {
	type FastifyInstance,
	type FastifyReply,
	type FastifyRequest,
} from 'fastify';
import {
	actionExecuteErrorResponseSchema,
	actionExecuteRequestSchema,
	actionExecuteResponseSchema,
	actionExecuteSuccessResponseSchema,
	sessionAdvanceRequestSchema,
	sessionAdvanceResponseSchema,
	sessionCreateRequestSchema,
	sessionCreateResponseSchema,
	sessionIdSchema,
	sessionStateResponseSchema,
} from '@kingdom-builder/protocol';
import type {
	ActionExecuteRequest,
	ActionExecuteResponse,
	SessionAdvanceResponse,
	SessionCreateResponse,
	SessionStateResponse,
} from '@kingdom-builder/protocol';
import {
	SessionTransport,
	TransportError,
	type SessionTransportOptions,
	type TransportRequest,
} from './SessionTransport.js';
import type { SessionManager } from '../session/SessionManager.js';
import type { AuthMiddleware } from '../auth/tokenAuthMiddleware.js';
import { AuthError } from '../auth/AuthError.js';

interface RequirementError extends Error {
	requirementFailure?: unknown;
	requirementFailures?: unknown;
}

export interface FastifySessionTransportOptions
	extends SessionTransportOptions {
	fastify?: FastifyInstance;
	build?: typeof Fastify;
}

type FastifySessionRequest<TBody = unknown> = FastifyRequest<{
	Params: { sessionId?: string };
	Body: TBody;
}>;

type FastifySessionHandler<TBody, TResponse> = (
	request: FastifySessionRequest<TBody>,
	reply: FastifyReply,
) => Promise<TResponse | void>;

export async function createFastifySessionTransport(
	options: FastifySessionTransportOptions,
): Promise<FastifyInstance> {
	const instance = options.fastify ?? (options.build ?? Fastify)();
	const transport = new SessionTransport(options);

	instance.post(
		'/sessions',
		wrapSessionRoute(async (request, reply) => {
			const payload = await handleCreateSession(request, transport);
			reply.code(201);
			return payload;
		}),
	);

	instance.get(
		'/sessions/:sessionId/snapshot',
		wrapSessionRoute(async (request) => {
			const payload = await handleGetSessionSnapshot(request, transport);
			return payload;
		}),
	);

	instance.post(
		'/sessions/:sessionId/actions',
		wrapSessionRoute(async (request) => {
			const payload = await handleExecuteAction(
				request,
				options.sessionManager,
				options.authMiddleware,
			);
			return payload;
		}),
	);

	instance.post(
		'/sessions/:sessionId/advance',
		wrapSessionRoute(async (request) => {
			const payload = await handleAdvanceSession(
				request,
				options.sessionManager,
				options.authMiddleware,
			);
			return payload;
		}),
	);

	return instance;
}

function wrapSessionRoute<TBody, TResponse>(
	handler: FastifySessionHandler<TBody, TResponse>,
): FastifySessionHandler<TBody, TResponse> {
	return async (request, reply) => {
		try {
			const payload = await handler(request, reply);
			if (payload === undefined) {
				return;
			}
			reply.code(reply.statusCode || 200);
			reply.type('application/json');
			reply.send(payload);
		} catch (error) {
			handleRouteError(error, reply);
		}
	};
}

async function handleCreateSession(
	request: FastifySessionRequest,
	transport: SessionTransport,
): Promise<SessionCreateResponse> {
	const parsed = sessionCreateRequestSchema.safeParse(request.body);
	if (!parsed.success) {
		throw new TransportError('INVALID_REQUEST', 'Invalid session payload.', {
			issues: parsed.error.issues,
		});
	}
	const response = transport.createSession(
		createTransportRequest(request, parsed.data),
	);
	return sessionCreateResponseSchema.parse(response);
}

async function handleGetSessionSnapshot(
	request: FastifySessionRequest,
	transport: SessionTransport,
): Promise<SessionStateResponse> {
	const sessionId = parseSessionId(request.params.sessionId);
	const response = transport.getSessionState(
		createTransportRequest(request, { sessionId }),
	);
	return sessionStateResponseSchema.parse(response);
}

async function handleAdvanceSession(
	request: FastifySessionRequest,
	sessionManager: SessionManager,
	authMiddleware: AuthMiddleware | undefined,
): Promise<SessionAdvanceResponse> {
	const sessionId = parseSessionId(request.params.sessionId);
	const parsed = sessionAdvanceRequestSchema.safeParse({ sessionId });
	if (!parsed.success) {
		throw new TransportError('INVALID_REQUEST', 'Invalid session identifier.', {
			issues: parsed.error.issues,
		});
	}
	if (authMiddleware) {
		try {
			authMiddleware(createTransportRequest(request, parsed.data));
		} catch (error) {
			if (error instanceof AuthError) {
				throw new TransportError(error.code, error.message, { cause: error });
			}
			throw error;
		}
	}
	const session = sessionManager.getSession(sessionId);
	if (!session) {
		throw new TransportError('NOT_FOUND', `Session "${sessionId}" not found.`);
	}
	const advance = await session.enqueue(() => session.advancePhase());
	const snapshot = sessionManager.getSnapshot(sessionId);
	const response: SessionAdvanceResponse = {
		sessionId,
		advance,
		snapshot,
	};
	return sessionAdvanceResponseSchema.parse(response);
}

async function handleExecuteAction(
	request: FastifySessionRequest,
	sessionManager: SessionManager,
	authMiddleware: AuthMiddleware | undefined,
): Promise<ActionExecuteResponse> {
	const sessionId = parseSessionId(request.params.sessionId);
	const rawBody = (request.body ?? {}) as Record<string, unknown>;
	const parsed = actionExecuteRequestSchema.safeParse({
		...rawBody,
		sessionId,
	});
	if (!parsed.success) {
		return actionExecuteErrorResponseSchema.parse(
			createActionErrorResponse('Invalid action payload.'),
		);
	}
	const session = sessionManager.getSession(sessionId);
	if (!session) {
		return actionExecuteErrorResponseSchema.parse(
			createActionErrorResponse(`Session "${sessionId}" not found.`),
		);
	}
	if (authMiddleware) {
		try {
			authMiddleware(createTransportRequest(request, parsed.data));
		} catch (error) {
			if (error instanceof AuthError) {
				throw new TransportError(error.code, error.message, { cause: error });
			}
			throw error;
		}
	}
	try {
		const traces = await session.enqueue(() =>
			session.performAction(parsed.data.actionId, parsed.data.params as never),
		);
		const snapshot = sessionManager.getSnapshot(sessionId);
		return actionExecuteSuccessResponseSchema.parse({
			status: 'success',
			snapshot,
			traces,
		});
	} catch (error) {
		const payload = mapActionError(error);
		return actionExecuteErrorResponseSchema.parse(payload);
	}
}

function parseSessionId(value: unknown): string {
	const parsed = sessionIdSchema.safeParse(value);
	if (!parsed.success) {
		throw new TransportError('INVALID_REQUEST', 'Invalid session identifier.', {
			issues: parsed.error.issues,
		});
	}
	return parsed.data;
}

function mapActionError(error: unknown): Record<string, unknown> {
	if (error instanceof TransportError) {
		return createActionErrorResponse(error.message);
	}
	if (!error || typeof error !== 'object') {
		return createActionErrorResponse('Action failed.');
	}
	const message = (error as { message?: unknown }).message;
	const requirementFailure = (error as RequirementError).requirementFailure;
	const requirementFailures = (error as RequirementError).requirementFailures;
	return createActionErrorResponse(
		typeof message === 'string' ? message : 'Action failed.',
		requirementFailure,
		requirementFailures,
	);
}

function createActionErrorResponse(
	error: string,
	requirementFailure?: unknown,
	requirementFailures?: unknown,
): Record<string, unknown> {
	const payload: Record<string, unknown> = {
		status: 'error',
		error,
	};
	if (requirementFailure !== undefined) {
		payload.requirementFailure = requirementFailure;
	}
	if (requirementFailures !== undefined) {
		payload.requirementFailures = requirementFailures;
	}
	return payload;
}

function handleRouteError(error: unknown, reply: FastifyReply): void {
	if (error instanceof TransportError) {
		reply.code(resolveStatus(error.code));
		reply.type('application/json');
		reply.send({
			error: error.code,
			message: error.message,
			issues: error.issues,
		});
		return;
	}
	reply.code(500);
	reply.type('application/json');
	reply.send({
		error: 'INTERNAL_SERVER_ERROR',
		message: 'An unexpected error occurred.',
	});
}

function resolveStatus(code: TransportError['code']): number {
	switch (code) {
		case 'INVALID_REQUEST': {
			return 400;
		}
		case 'NOT_FOUND': {
			return 404;
		}
		case 'CONFLICT': {
			return 409;
		}
		case 'UNAUTHORIZED': {
			return 401;
		}
		case 'FORBIDDEN':
		default: {
			return 403;
		}
	}
}

function createTransportRequest<TBody>(
	request: FastifySessionRequest<TBody>,
	body: TBody,
): TransportRequest<TBody> {
	return {
		body,
		headers: normalizeHeaders(request.headers),
	};
}

function normalizeHeaders(
	headers: FastifyRequest['headers'],
): Record<string, string> {
	const normalized: Record<string, string> = {};
	for (const [key, value] of Object.entries(headers)) {
		if (Array.isArray(value)) {
			if (value.length === 0) {
				continue;
			}
			normalized[key.toLowerCase()] = value.join(', ');
			continue;
		}
		if (value === undefined) {
			continue;
		}
		normalized[key.toLowerCase()] = String(value);
	}
	return normalized;
}
