import type {
	SessionCreateRequest,
	SessionSnapshot,
} from '@kingdom-builder/protocol';
import type {
	CreateSessionOptions,
	SessionManager,
} from '../session/SessionManager.js';
import { sanitizePlayerNameEntries } from './playerNameHelpers.js';
import { TransportError } from './TransportTypes.js';

export interface CreateSessionHelperOptions {
	sessionManager: SessionManager;
	generateId: () => string;
	request: SessionCreateRequest;
}

export interface CreateSessionHelperResult {
	sessionId: string;
	snapshot: SessionSnapshot;
}

export function createSessionCore(
	options: CreateSessionHelperOptions,
): CreateSessionHelperResult {
	const { sessionManager, generateId, request } = options;
	const sanitizedNames = request.playerNames
		? sanitizePlayerNameEntries(request.playerNames)
		: undefined;
	const sessionId = generateId();
	try {
		const createOptions: CreateSessionOptions = {};
		if (request.devMode !== undefined) {
			createOptions.devMode = request.devMode;
		}
		if (request.config !== undefined) {
			createOptions.config = request.config;
		}
		const session = sessionManager.createSession(sessionId, createOptions);
		if (sanitizedNames) {
			for (const [playerId, playerName] of sanitizedNames) {
				session.updatePlayerName(playerId, playerName);
			}
		}
	} catch (error) {
		throw new TransportError('CONFLICT', 'Failed to create session.', {
			cause: error,
		});
	}
	const snapshot = sessionManager.getSnapshot(sessionId);
	return { sessionId, snapshot };
}
