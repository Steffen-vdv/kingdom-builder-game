import { resolve, dirname } from 'node:path';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import fastify from 'fastify';
import type { FastifyInstance, FastifyServerOptions } from 'fastify';
import { SessionManager } from './session/SessionManager.js';
import { createSessionTransportPlugin } from './transport/FastifySessionTransport.js';
import type { FastifySessionTransportOptions } from './transport/FastifySessionTransport.js';
import { createTokenAuthMiddleware } from './auth/tokenAuthMiddleware.js';
import type { TokenDefinition } from './auth/tokenAuthMiddleware.js';
import { Database } from './database/Database.js';
import { MigrationRunner } from './database/MigrationRunner.js';
import { VisitorTracker } from './visitors/VisitorTracker.js';
import { HourlyScheduler } from './visitors/HourlyScheduler.js';

export { SessionManager } from './session/SessionManager.js';
export type {
	SessionManagerOptions,
	CreateSessionOptions,
} from './session/SessionManager.js';
export type { SessionStaticMetadataPayload } from './session/buildSessionMetadata.js';
export { SessionTransport } from './transport/SessionTransport.js';
export type { SessionTransportOptions } from './transport/SessionTransport.js';
export { HttpSessionGateway } from './client/HttpSessionGateway.js';
export type { HttpSessionGatewayOptions } from './client/HttpSessionGateway.js';
export type {
	FetchActionCostsHandler,
	FetchActionOptionsHandler,
	FetchActionRequirementsHandler,
	HeaderFactory,
	HeaderInput,
	HttpExecutionResult,
	RequestOptions,
	RunAiTurnHandler,
	SimulatePhasesHandler,
} from './client/HttpSessionGatewayTypes.js';
export type {
	SessionGateway,
	SessionActionCostRequest,
	SessionActionCostResponse,
	SessionActionRequirementRequest,
	SessionActionRequirementResponse,
	SessionActionOptionsRequest,
	SessionActionOptionsResponse,
	SessionRunAiRequest,
	SessionRunAiResponse,
	SessionSimulateRequest,
	SessionSimulateResponse,
} from '@kingdom-builder/protocol';
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
export { Database, type DatabaseOptions } from './database/index.js';
export {
	MigrationRunner,
	type MigrationRunnerOptions,
	type MigrationRecord,
	type MigrationResult,
} from './database/index.js';
export {
	VisitorTracker,
	HourlyScheduler,
	type VisitorTrackerOptions,
	type HourlyVisitorStats,
	type VisitorStats24h,
	type HourlySchedulerOptions,
} from './visitors/index.js';

// eslint-disable-next-line max-len
export interface StartServerOptions extends Partial<FastifySessionTransportOptions> {
	host?: string;
	port?: number;
	logger?: FastifyServerOptions['logger'];
	env?: NodeJS.ProcessEnv;
	tokens?: Record<string, TokenDefinition>;
	allowDevToken?: boolean;
	/**
	 * Enable visitor tracking with SQLite database.
	 * When true, initializes database, runs migrations, and tracks visitors.
	 * Defaults to true if not explicitly set.
	 */
	enableVisitorTracking?: boolean;
}

export interface StartServerResult {
	app: FastifyInstance;
	address: string;
	host: string;
	port: number;
	/**
	 * Database instance (if visitor tracking is enabled).
	 * Call database.close() when shutting down the server.
	 */
	database?: Database;
	/**
	 * Hourly scheduler (if visitor tracking is enabled).
	 * Call scheduler.stop() when shutting down the server.
	 */
	hourlyScheduler?: HourlyScheduler;
}

export async function startServer(
	options: StartServerOptions = {},
): Promise<StartServerResult> {
	const env = options.env ?? process.env;
	const host = resolveHost(options.host, env);
	const port = resolvePort(options.port, env);
	const sessionManager = options.sessionManager ?? new SessionManager();
	const tokens = resolveTokens(options.tokens, env, options.allowDevToken);
	const middlewareOptions = tokens ? { env, tokens } : { env };
	const authMiddleware = createTokenAuthMiddleware(middlewareOptions);
	const app = fastify({ logger: options.logger ?? false });
	const logger = options.logger ? app.log : undefined;

	// Initialize database and visitor tracking (enabled by default)
	const enableTracking = options.enableVisitorTracking ?? true;
	let database: Database | undefined;
	let visitorTracker: VisitorTracker | undefined;
	let hourlyScheduler: HourlyScheduler | undefined;

	if (enableTracking) {
		database = new Database({ env });
		const dbPath = database.getPath();

		// Ensure database directory exists
		try {
			mkdirSync(dirname(dbPath), { recursive: true });
		} catch {
			// Directory may already exist
		}

		database.open();
		logger?.info(`Database opened at ${dbPath}`);

		// Run migrations
		const migrationRunner = new MigrationRunner(database);
		const migrationResult = migrationRunner.run();
		if (migrationResult.applied.length > 0) {
			logger?.info(
				`Applied ${migrationResult.applied.length} migration(s): ` +
					migrationResult.applied.map((mig) => mig.name).join(', '),
			);
		} else if (migrationResult.alreadyUpToDate) {
			logger?.info('Database schema is up to date');
		}

		// Initialize visitor tracker
		visitorTracker = new VisitorTracker({ database });

		// Start hourly scheduler for persisting visitor stats
		hourlyScheduler = new HourlyScheduler({
			onHour: () => {
				visitorTracker?.persistCurrentHour();
				logger?.info('Persisted hourly visitor stats');
			},
			logger: (msg) => logger?.info(msg),
		});
		hourlyScheduler.start();
	}

	const transportOptions: FastifySessionTransportOptions = {
		sessionManager,
		authMiddleware,
	};
	if (visitorTracker) {
		transportOptions.visitorTracker = visitorTracker;
	}
	if (options.idFactory) {
		transportOptions.idFactory = options.idFactory;
	}
	await app.register(createSessionTransportPlugin, transportOptions);
	logger?.info('Starting Kingdom Builder server...');
	try {
		const address = await app.listen({ host, port });
		logger?.info(`Kingdom Builder server listening on ${address}`);
		const url = new URL(address);
		const result: StartServerResult = {
			app,
			address,
			host: url.hostname,
			port: Number.parseInt(url.port, 10),
		};
		if (database) {
			result.database = database;
		}
		if (hourlyScheduler) {
			result.hourlyScheduler = hourlyScheduler;
		}
		return result;
	} catch (error) {
		logger?.error(error, 'Failed to start Kingdom Builder server.');
		hourlyScheduler?.stop();
		database?.close();
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
		if (value === 0 || (typeof value === 'number' && value > 0)) {
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

const DEV_TOKEN_KEY = 'local-dev';
const DEV_TOKEN: Record<string, TokenDefinition> = {
	[DEV_TOKEN_KEY]: {
		userId: DEV_TOKEN_KEY,
		roles: ['admin', 'session:create', 'session:advance'],
	},
};

function resolveTokens(
	tokens: Record<string, TokenDefinition> | undefined,
	env: NodeJS.ProcessEnv,
	allowDevToken: boolean | undefined,
): Record<string, TokenDefinition> | undefined {
	const sanitized = sanitizeTokens(tokens);
	if (sanitized.valid) {
		return sanitized.valid;
	}
	if (sanitized.hadEntries) {
		const message =
			'Token definitions include empty token strings. ' +
			'Provide non-empty token keys to enable authentication.';
		console.error(message);
		throw new Error(message);
	}
	const envTokens = env.KB_SERVER_AUTH_TOKENS;
	if (isNonEmptyString(envTokens)) {
		return undefined;
	}
	const devTokenOptIn =
		allowDevToken ?? readBoolean(env.KB_SERVER_ALLOW_DEV_TOKEN);
	if (devTokenOptIn) {
		console.warn(
			'KB_SERVER_AUTH_TOKENS not set; using default dev token ' +
				'"local-dev".',
		);
		return DEV_TOKEN;
	}
	const guidance = [
		'Authentication tokens are not configured.',
		'Provide tokens via StartServerOptions.tokens or set',
		'KB_SERVER_AUTH_TOKENS to a JSON map of token definitions.',
		'Alternatively, enable the development token with',
		'allowDevToken or KB_SERVER_ALLOW_DEV_TOKEN=1.',
	].join(' ');
	if (isProductionEnv(env)) {
		console.error(guidance);
		throw new Error(guidance);
	}
	console.warn(guidance);
	return undefined;
}

function sanitizeTokens(tokens: Record<string, TokenDefinition> | undefined): {
	valid: Record<string, TokenDefinition> | undefined;
	hadEntries: boolean;
} {
	if (!tokens) {
		return { valid: undefined, hadEntries: false };
	}
	const entries = Object.entries(tokens);
	const filtered = entries.filter(([token]) => token.trim().length > 0);
	if (filtered.length === 0) {
		return {
			valid: undefined,
			hadEntries: entries.length > 0,
		};
	}
	return {
		valid: Object.fromEntries(filtered) as Record<string, TokenDefinition>,
		hadEntries: true,
	};
}

function isNonEmptyString(value: string | undefined): boolean {
	return typeof value === 'string' && value.trim().length > 0;
}

function readBoolean(value: string | undefined): boolean | undefined {
	if (!value) {
		return undefined;
	}
	const normalized = value.trim().toLowerCase();
	if (normalized === '1' || normalized === 'true' || normalized === 'yes') {
		return true;
	}
	if (normalized === '0' || normalized === 'false' || normalized === 'no') {
		return false;
	}
	return undefined;
}

function isProductionEnv(env: NodeJS.ProcessEnv): boolean {
	const value = env.NODE_ENV ?? '';
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
		startServer({ logger: true }).catch((_error) => {
			process.exitCode = 1;
		});
	}
}
