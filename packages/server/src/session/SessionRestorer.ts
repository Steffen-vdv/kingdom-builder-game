import {
	createEngineSession,
	type EngineSession,
} from '@kingdom-builder/engine';
import type { SessionPlayerId } from '@kingdom-builder/protocol';
import type {
	ActionLogEntry,
	PersistedSessionData,
	SessionPersistence,
} from './SessionPersistence.js';

type EngineSessionOptions = Parameters<typeof createEngineSession>[0];

/**
 * Options required for restoring sessions from persistence.
 */
export interface SessionRestorerOptions {
	persistence: SessionPersistence;
	baseOptions: Omit<EngineSessionOptions, 'config'>;
}

/**
 * Result of restoring a session from persistence.
 */
export interface RestoredSession {
	session: EngineSession;
	createdAt: number;
	creationOptions: PersistedSessionData['creationOptions'];
	actionLog: ActionLogEntry[];
}

/**
 * Handles restoring sessions from persistence by replaying action logs.
 */
export class SessionRestorer {
	private readonly persistence: SessionPersistence;
	private readonly baseOptions: Omit<EngineSessionOptions, 'config'>;

	public constructor(options: SessionRestorerOptions) {
		this.persistence = options.persistence;
		this.baseOptions = options.baseOptions;
	}

	/**
	 * Attempts to restore a session from persistence.
	 * Returns undefined if session doesn't exist or has expired.
	 */
	public restore(sessionId: string): RestoredSession | undefined {
		const persisted = this.persistence.load(sessionId);
		if (!persisted) {
			return undefined;
		}
		const session = this.recreateSession(persisted);
		this.replayActionLog(session, persisted.actionLog);
		return {
			session,
			createdAt: persisted.createdAt,
			creationOptions: persisted.creationOptions,
			actionLog: persisted.actionLog,
		};
	}

	private recreateSession(persisted: PersistedSessionData): EngineSession {
		const devMode = persisted.creationOptions.devMode ?? false;
		const { config, playerNames } = persisted.creationOptions;
		const sessionOptions: EngineSessionOptions = {
			...this.baseOptions,
		};
		if (config !== undefined) {
			sessionOptions.config = config;
		}
		const session = createEngineSession(sessionOptions);
		session.setDevMode(devMode);
		// Apply player names if they were set during creation
		if (playerNames) {
			for (const [playerId, name] of Object.entries(playerNames)) {
				if (name) {
					session.updatePlayerName(playerId as SessionPlayerId, name);
				}
			}
		}
		return session;
	}

	private replayActionLog(
		session: EngineSession,
		actionLog: ActionLogEntry[],
	): void {
		for (const entry of actionLog) {
			this.replayLogEntry(session, entry);
		}
	}

	private replayLogEntry(session: EngineSession, entry: ActionLogEntry): void {
		switch (entry.type) {
			case 'action':
				session.performAction(entry.actionId, entry.params);
				break;
			case 'advance':
				session.advancePhase();
				break;
			case 'player-name':
				session.updatePlayerName(entry.playerId, entry.name);
				break;
			case 'dev-mode':
				session.setDevMode(entry.enabled);
				break;
		}
	}
}
