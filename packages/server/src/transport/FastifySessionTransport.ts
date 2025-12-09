import type {
	FastifyPluginCallback,
	FastifyReply,
	FastifyRequest,
} from 'fastify';
import {
	sessionIdSchema,
	visitorStatsResponseSchema,
} from '@kingdom-builder/protocol';
import type { VisitorStatsResponse } from '@kingdom-builder/protocol';
import { SessionTransport } from './SessionTransport.js';
import type { SessionTransportOptions } from './SessionTransport.js';
import { TransportError } from './TransportTypes.js';
import type { TransportErrorCode } from './TransportTypes.js';
import type { VisitorTracker } from '../visitors/VisitorTracker.js';

// prettier-ignore
export interface FastifySessionTransportOptions
	extends SessionTransportOptions {
	/**
	 * Visitor tracker for recording and reporting visitor stats.
	 */
	visitorTracker: VisitorTracker;
}

interface MetadataQuerystring {
	sessionId?: string;
}

interface VisitorQuerystring {
	breakdown?: string;
}

export const createSessionTransportPlugin: FastifyPluginCallback<
	FastifySessionTransportOptions
> = (fastify, options, done) => {
	const transport = new SessionTransport(options);
	const { visitorTracker } = options;

	// Track visitors on each request
	fastify.addHook('onRequest', (request, _reply, hookDone) => {
		const clientIp = extractClientIp(request);
		if (clientIp) {
			visitorTracker.recordVisitor(clientIp);
		}
		hookDone();
	});

	// Visitor stats endpoint (requires auth)
	fastify.get<{ Querystring: VisitorQuerystring }>(
		'/visitors',
		async (request, reply) => {
			try {
				transport.requireAuthorizationPublic(request, 'session:advance');
				const includeBreakdown = request.query.breakdown === 'true';
				const stats = visitorTracker.get24hStats();
				const response: VisitorStatsResponse = {
					totalVisitors: stats.totalVisitors,
					hoursIncluded: stats.hoursIncluded,
					...(includeBreakdown
						? { hourlyBreakdown: stats.hourlyBreakdown }
						: {}),
				};
				return reply.send(visitorStatsResponseSchema.parse(response));
			} catch (error) {
				return handleTransportError(reply, error);
			}
		},
	);

	fastify.get('/runtime-config', async (_request, reply) => {
		try {
			const response = transport.getRuntimeConfig();
			return reply.send(response);
		} catch (error) {
			return handleTransportError(reply, error);
		}
	});

	fastify.get<{ Querystring: MetadataQuerystring }>(
		'/metadata',
		async (request, reply) => {
			try {
				let sessionId: string | undefined;
				if (request.query.sessionId !== undefined) {
					const parsed = sessionIdSchema.safeParse(request.query.sessionId);
					if (!parsed.success) {
						throw new TransportError(
							'INVALID_REQUEST',
							'Invalid session identifier.',
							{ issues: parsed.error.issues },
						);
					}
					sessionId = parsed.data;
				}
				const response = transport.getMetadataSnapshot(sessionId);
				return reply.send(response);
			} catch (error) {
				return handleTransportError(reply, error);
			}
		},
	);

	fastify.post('/sessions', async (request, reply) => {
		try {
			const response = transport.createSession({
				body: request.body,
				headers: extractHeaders(request),
			});
			return reply.status(201).send(response);
		} catch (error) {
			return handleTransportError(reply, error);
		}
	});

	fastify.get<SessionRequestParams>(
		'/sessions/:id/snapshot',
		async (request, reply) => {
			try {
				const response = transport.getSessionState({
					body: { sessionId: request.params.id },
					headers: extractHeaders(request),
				});
				return reply.send(response);
			} catch (error) {
				return handleTransportError(reply, error);
			}
		},
	);

	fastify.post<SessionRequestParams>(
		'/sessions/:id/advance',
		async (request, reply) => {
			try {
				const response = await transport.advanceSession({
					body: { sessionId: request.params.id },
					headers: extractHeaders(request),
				});
				return reply.send(response);
			} catch (error) {
				return handleTransportError(reply, error);
			}
		},
	);

	fastify.post<SessionRequestParams>(
		'/sessions/:id/actions',
		async (request, reply) => {
			try {
				const payload = mergeSessionPayload(request);
				const response = await transport.executeAction({
					body: payload,
					headers: extractHeaders(request),
				});
				return reply.status(response.httpStatus ?? 200).send(response);
			} catch (error) {
				return handleTransportError(reply, error);
			}
		},
	);

	fastify.post<SessionActionRequestParams>(
		'/sessions/:id/actions/:actionId/costs',
		async (request, reply) => {
			try {
				const payload = mergeSessionPayload(request);
				const response = transport.getActionCosts({
					body: payload,
					headers: extractHeaders(request),
				});
				return reply.send(response);
			} catch (error) {
				return handleTransportError(reply, error);
			}
		},
	);

	fastify.post<SessionActionRequestParams>(
		'/sessions/:id/actions/:actionId/requirements',
		async (request, reply) => {
			try {
				const payload = mergeSessionPayload(request);
				const headers = extractHeaders(request);
				const response = transport.getActionRequirements({
					body: payload,
					headers,
				});
				return reply.send(response);
			} catch (error) {
				return handleTransportError(reply, error);
			}
		},
	);

	fastify.get<SessionActionRequestParams>(
		'/sessions/:id/actions/:actionId/options',
		async (request, reply) => {
			try {
				const payload = mergeSessionPayload(request);
				const headers = extractHeaders(request);
				const response = transport.getActionOptions({
					body: payload,
					headers,
				});
				return reply.send(response);
			} catch (error) {
				return handleTransportError(reply, error);
			}
		},
	);

	fastify.post<SessionRequestParams>(
		'/sessions/:id/ai-turn',
		async (request, reply) => {
			try {
				const payload = mergeSessionPayload(request);
				const headers = extractHeaders(request);
				const response = await transport.runAiTurn({
					body: payload,
					headers,
				});
				return reply.send(response);
			} catch (error) {
				return handleTransportError(reply, error);
			}
		},
	);

	fastify.post<SessionRequestParams>(
		'/sessions/:id/simulate',
		async (request, reply) => {
			try {
				const payload = mergeSessionPayload(request);
				const headers = extractHeaders(request);
				const response = await transport.simulateUpcomingPhases({
					body: payload,
					headers,
				});
				return reply.send(response);
			} catch (error) {
				return handleTransportError(reply, error);
			}
		},
	);

	fastify.post<SessionRequestParams>(
		'/sessions/:id/dev-mode',
		async (request, reply) => {
			try {
				const payload = mergeSessionPayload(request);
				const response = transport.setDevMode({
					body: payload,
					headers: extractHeaders(request),
				});
				return reply.send(response);
			} catch (error) {
				return handleTransportError(reply, error);
			}
		},
	);

	fastify.patch<SessionRequestParams>(
		'/sessions/:id/player',
		async (request, reply) => {
			try {
				const payload = mergeSessionPayload(request);
				const response = transport.updatePlayerName({
					body: payload,
					headers: extractHeaders(request),
				});
				return reply.send(response);
			} catch (error) {
				return handleTransportError(reply, error);
			}
		},
	);

	done();
};

type SessionRequestParams = {
	Params: {
		id: string;
	};
};

type SessionActionRequestParams = {
	Params: {
		id: string;
		actionId: string;
	};
};

type SessionRequestBody = Record<string, unknown>;

type SessionRequest = FastifyRequest<
	SessionRequestParams | SessionActionRequestParams
>;

function mergeSessionPayload(request: SessionRequest): SessionRequestBody {
	const body =
		typeof request.body === 'object' && request.body !== null
			? { ...(request.body as SessionRequestBody) }
			: {};
	body.sessionId = request.params.id;
	if ('actionId' in request.params) {
		body.actionId = request.params.actionId;
	}
	return body;
}

function extractHeaders(
	request: FastifyRequest,
): Record<string, string | undefined> {
	const headers: Record<string, string | undefined> = {};
	for (const [key, value] of Object.entries(request.headers)) {
		if (typeof value === 'string') {
			headers[key] = value;
			continue;
		}
		if (Array.isArray(value) && value.length > 0) {
			headers[key] = value[value.length - 1];
		}
	}
	return headers;
}

function handleTransportError(
	reply: FastifyReply,
	error: unknown,
): FastifyReply {
	if (error instanceof TransportError) {
		return reply.status(statusFromErrorCode(error.code)).send({
			code: error.code,
			message: error.message,
			issues: error.issues,
		});
	}
	throw error;
}

function statusFromErrorCode(code: TransportErrorCode): number {
	switch (code) {
		case 'INVALID_REQUEST':
			return 400;
		case 'NOT_FOUND':
			return 404;
		case 'CONFLICT':
			return 409;
		case 'UNAUTHORIZED':
			return 401;
		case 'FORBIDDEN':
			return 403;
		default:
			return 500;
	}
}

/**
 * Extracts the client IP address from a Fastify request.
 * Handles X-Forwarded-For header for proxied requests.
 */
function extractClientIp(request: FastifyRequest): string | undefined {
	// Check X-Forwarded-For header first (for reverse proxies)
	const forwardedFor = request.headers['x-forwarded-for'];
	if (typeof forwardedFor === 'string') {
		// X-Forwarded-For can contain multiple IPs, take the first (client)
		const firstIp = forwardedFor.split(',')[0]?.trim();
		if (firstIp) {
			return firstIp;
		}
	}
	// Fall back to direct connection IP
	return request.ip;
}
