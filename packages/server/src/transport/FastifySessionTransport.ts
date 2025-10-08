import Fastify, { type FastifyInstance, type FastifyReply } from 'fastify';
import type { FastifyListenOptions, FastifyServerOptions } from 'fastify';
import { SessionTransport, TransportError } from './SessionTransport.js';
import type { TransportErrorCode } from './SessionTransport.js';
import type { ActionExecuteResponse } from '@kingdom-builder/protocol';

type FastifyLoggerOption = FastifyServerOptions['logger'];

export interface FastifySessionTransportOptions {
	sessionTransport: SessionTransport;
	instance?: FastifyInstance;
	logger?: FastifyLoggerOption;
}

export interface FastifySessionTransportStartOptions {
	port: number;
	host?: string;
}

export interface TransportErrorPayload {
	status: 'error';
	code: TransportErrorCode;
	message: string;
	issues?: unknown;
}

export class FastifySessionTransport {
	private readonly app: FastifyInstance;

	private readonly transport: SessionTransport;

	public constructor(options: FastifySessionTransportOptions) {
		this.transport = options.sessionTransport;
		this.app = options.instance ?? Fastify({ logger: options.logger ?? false });
		this.registerRoutes();
	}

	public get instance(): FastifyInstance {
		return this.app;
	}

	public async start(
		options: FastifySessionTransportStartOptions,
	): Promise<void> {
		const listenOptions: FastifyListenOptions = { port: options.port };
		if (options.host !== undefined) {
			listenOptions.host = options.host;
		}
		await this.app.listen(listenOptions);
	}

	public async stop(): Promise<void> {
		await this.app.close();
	}

	private registerRoutes(): void {
		this.app.post<{ Body: unknown }>('/sessions', async (request, reply) => {
			try {
				const response = this.transport.createSession(request.body);
				reply.code(201).send(response);
			} catch (error) {
				this.sendTransportError(reply, error);
			}
		});

		this.app.get<{ Params: { id: string } }>(
			'/sessions/:id/snapshot',
			(request, reply) => {
				try {
					const response = this.transport.getSessionState({
						sessionId: request.params.id,
					});
					reply.send(response);
				} catch (error) {
					this.sendTransportError(reply, error);
				}
			},
		);

		this.app.post<{ Params: { id: string } }>(
			'/sessions/:id/advance',
			async (request, reply) => {
				try {
					const response = await this.transport.advanceSession({
						sessionId: request.params.id,
					});
					reply.send(response);
				} catch (error) {
					this.sendTransportError(reply, error);
				}
			},
		);

		this.app.post<{ Params: { id: string }; Body: unknown }>(
			'/sessions/:id/actions',
			async (request, reply) => {
				const payload = {
					...this.normalizeBody(request.body),
					sessionId: request.params.id,
				};
				try {
					const result = await this.transport.performAction(payload);
					this.sendActionResult(reply, result);
				} catch (error) {
					this.sendTransportError(reply, error);
				}
			},
		);
	}

	private sendActionResult(
		reply: FastifyReply,
		result: ActionExecuteResponse,
	): void {
		if (result.status === 'error') {
			reply.code(400).send(result);
			return;
		}
		reply.send(result);
	}

	private normalizeBody(body: unknown): Record<string, unknown> {
		if (body && typeof body === 'object') {
			return body as Record<string, unknown>;
		}
		return {};
	}

	private sendTransportError(reply: FastifyReply, error: unknown): void {
		if (error instanceof TransportError) {
			const payload = this.createTransportErrorPayload(error);
			reply.code(this.statusFromCode(error.code)).send(payload);
			return;
		}
		throw error;
	}

	private createTransportErrorPayload(
		error: TransportError,
	): TransportErrorPayload {
		const payload: TransportErrorPayload = {
			status: 'error',
			code: error.code,
			message: error.message,
		};
		if (error.issues !== undefined) {
			payload.issues = error.issues;
		}
		return payload;
	}

	private statusFromCode(code: TransportErrorCode): number {
		switch (code) {
			case 'INVALID_REQUEST':
				return 400;
			case 'NOT_FOUND':
				return 404;
			case 'CONFLICT':
				return 409;
			default:
				return 500;
		}
	}
}
