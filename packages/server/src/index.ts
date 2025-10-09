import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

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

export function startServer(): void {
	console.log('Starting Kingdom Builder server...');
}

const entrypoint = process.argv[1];
const currentModule = fileURLToPath(import.meta.url);

if (entrypoint !== undefined) {
	const normalizedEntrypoint = resolve(entrypoint);
	const normalizedModule = resolve(currentModule);

	if (normalizedEntrypoint === normalizedModule) {
		startServer();
	}
}
