import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import fastify from 'fastify';
import type { FastifyInstance } from 'fastify';
import { SessionManager } from './session/SessionManager.js';
import { createSessionTransportPlugin } from './transport/FastifySessionTransport.js';
import type { FastifySessionTransportOptions } from './transport/FastifySessionTransport.js';
import { createTokenAuthMiddleware } from './auth/tokenAuthMiddleware.js';
import type { TokenDefinition } from './auth/tokenAuthMiddleware.js';

export { SessionManager } from './session/SessionManager.js';
export type {
	SessionManagerOptions,
	CreateSessionOptions,
} from './session/SessionManager.js';
export { SessionTransport } from './transport/SessionTransport.js';
export type { SessionTransportOptions } from './transport/SessionTransport.js';
export { HttpSessionGateway } from './client/HttpSessionGateway.js';
export type { HttpSessionGatewayOptions } from './client/HttpSessionGateway.js';
export { TransportError } from './transport/TransportTypes.js';
export type {
	TransportErrorCode,
	TransportRequest,
} from './transport/TransportTypes.js';
export { createSessionTransportPlugin } from './transport/FastifySessionTransport.js';
export type { FastifySessionTransportOptions } from './transport/FastifySessionTransport.js';
export type { AuthContext, AuthRole } from './auth/AuthContext.js';
export { AuthError } from './auth/AuthError.js';
export {
	createTokenAuthMiddleware,
	type AuthenticatedRequest,
	type AuthMiddleware,
} from './auth/tokenAuthMiddleware.js';

export interface StartServerOptions
	extends Partial<FastifySessionTransportOptions> {
	host?: string;
	port?: number;
	logger?: boolean;
	env?: NodeJS.ProcessEnv;
	tokens?: Record<string, TokenDefinition>;
}

export interface StartServerResult {
	app: FastifyInstance;
	address: string;
	host: string;
	port: number;
}

export async function startServer(
	options: StartServerOptions = {},
): Promise<StartServerResult> {
	const env = options.env ?? process.env;
	const host = resolveHost(options.host, env);
	const port = resolvePort(options.port, env);
	const sessionManager = options.sessionManager ?? new SessionManager();
	const tokens = resolveTokens(options.tokens, env);
	const middlewareOptions = tokens ? { env, tokens } : { env };
	const authMiddleware = createTokenAuthMiddleware(middlewareOptions);
	const app = fastify({ logger: options.logger ?? false });
	const transportOptions: FastifySessionTransportOptions = {
		sessionManager,
		authMiddleware,
	};
	if (options.idFactory) {
		transportOptions.idFactory = options.idFactory;
	}
	await app.register(createSessionTransportPlugin, transportOptions);
	console.log('Starting Kingdom Builder server...');
	try {
		const address = await app.listen({ host, port });
		console.log(`Kingdom Builder server listening on ${address}`);
		const url = new URL(address);
		return {
			app,
			address,
			host: url.hostname,
			port: Number.parseInt(url.port, 10),
		} satisfies StartServerResult;
	} catch (error) {
		console.error('Failed to start Kingdom Builder server.', error);
		await app.close();
		throw error;
	}
}

function resolveHost(host: string | undefined, env: NodeJS.ProcessEnv): string {
	if (host) {
		return host;
	}
	return env.KB_SERVER_HOST ?? '0.0.0.0';
}

function resolvePort(port: number | undefined, env: NodeJS.ProcessEnv): number {
	const candidates = [
		port,
		readNumber(env.KB_SERVER_PORT),
		readNumber(env.PORT),
	];
	for (const value of candidates) {
		if (value && value > 0) {
			return value;
		}
	}
	return 3001;
}

function readNumber(value: string | undefined): number | undefined {
	if (!value) {
		return undefined;
	}
	const parsed = Number.parseInt(value, 10);
	return Number.isFinite(parsed) ? parsed : undefined;
}

const DEV_TOKEN_FLAG = 'KB_SERVER_ALLOW_DEV_TOKEN';
const DEV_TOKEN_TRUE_VALUES = new Set(['1', 'true', 'yes', 'on']);

function resolveTokens(
	tokens: Record<string, TokenDefinition> | undefined,
	env: NodeJS.ProcessEnv,
): Record<string, TokenDefinition> | undefined {
	if (tokens && Object.keys(tokens).length > 0) {
		return tokens;
	}
	const envTokens = env.KB_SERVER_AUTH_TOKENS;
	if (typeof envTokens === 'string') {
		if (envTokens.trim().length === 0) {
			const message =
				'KB_SERVER_AUTH_TOKENS is set but empty. Provide a JSON token map.';
			console.error(message);
			throw new Error(message);
		}
		return undefined;
	}
	if (isProductionEnvironment(env)) {
		const message =
			'Authentication tokens are required in production. ' +
			'Set KB_SERVER_AUTH_TOKENS or pass tokens to startServer().';
		console.error(message);
		throw new Error(message);
	}
	if (isDevTokenAllowed(env)) {
		console.warn(
			'KB_SERVER_AUTH_TOKENS not set; using default dev token "local-dev".',
		);
		return {
			'local-dev': {
				userId: 'local-dev',
				roles: ['admin', 'session:create', 'session:advance'],
			},
		} satisfies Record<string, TokenDefinition>;
	}
	console.warn(
		'Authentication tokens are not configured. ' +
			'Set KB_SERVER_AUTH_TOKENS or enable KB_SERVER_ALLOW_DEV_TOKEN=1 ' +
			'to use the default dev token.',
	);
	return undefined;
}

function isDevTokenAllowed(env: NodeJS.ProcessEnv): boolean {
	const value = env[DEV_TOKEN_FLAG];
	if (!value) {
		return false;
	}
	return DEV_TOKEN_TRUE_VALUES.has(value.trim().toLowerCase());
}

function isProductionEnvironment(env: NodeJS.ProcessEnv): boolean {
	const value = env.NODE_ENV;
	if (!value) {
		return false;
	}
	return value.trim().toLowerCase() === 'production';
}

const entrypoint = process.argv[1];
const currentModule = fileURLToPath(import.meta.url);
const autostartDisabled =
	(process.env.KB_SERVER_DISABLE_AUTOSTART ?? '').toLowerCase() === '1';

if (!autostartDisabled && entrypoint !== undefined) {
	const normalizedEntrypoint = resolve(entrypoint);
	const normalizedModule = resolve(currentModule);

	if (normalizedEntrypoint === normalizedModule) {
		startServer().catch((error) => {
			console.error('Server failed to start.', error);
			process.exitCode = 1;
		});
	}
}
