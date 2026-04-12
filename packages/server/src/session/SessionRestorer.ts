import {
	createEngineSession,
	type EngineSession,
	type RuntimeResourceContent,
} from '@kingdom-builder/engine';
import type { SessionPlayerId } from '@kingdom-builder/protocol';
import {
	loadContentPackage,
	DEFAULT_CONTENT_ID,
} from '@kingdom-builder/contents';
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
	/**
	 * Fallback base options for sessions without contentId.
	 * Used for backwards compatibility with sessions created
	 * before content package support was added.
	 */
	baseOptions?: Omit<EngineSessionOptions, 'config'>;
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
	private readonly baseOptions?: Omit<EngineSessionOptions, 'config'>;

	public constructor(options: SessionRestorerOptions) {
		this.persistence = options.persistence;
		if (options.baseOptions !== undefined) {
			this.baseOptions = options.baseOptions;
		}
	}

	/**
	 * Attempts to restore a session from persistence.
	 * Returns undefined if session doesn't exist or has expired.
	 */
	public async restore(
		sessionId: string,
	): Promise<RestoredSession | undefined> {
		const persisted = this.persistence.load(sessionId);
		if (!persisted) {
			return undefined;
		}
		const session = await this.recreateSession(persisted);
		this.replayActionLog(session, persisted.actionLog);
		return {
			session,
			createdAt: persisted.createdAt,
			creationOptions: persisted.creationOptions,
			actionLog: persisted.actionLog,
		};
	}

	private async recreateSession(
		persisted: PersistedSessionData,
	): Promise<EngineSession> {
		const { config, playerNames, contentId } = persisted.creationOptions;

		let sessionOptions: EngineSessionOptions;

		if (this.baseOptions && this.baseOptions.resourceCatalog) {
			// Use constructor-provided options (for testing with synthetic content)
			sessionOptions = {
				actions: this.baseOptions.actions,
				actionMetaCategories: this.baseOptions.actionMetaCategories,
				buildings: this.baseOptions.buildings,
				developments: this.baseOptions.developments,
				phases: this.baseOptions.phases,
				rules: this.baseOptions.rules,
				resourceCatalog: this.baseOptions.resourceCatalog,
			};
		} else {
			// Load content package dynamically
			const effectiveContentId = contentId ?? DEFAULT_CONTENT_ID;
			const content = await loadContentPackage(effectiveContentId);
			sessionOptions = {
				actions: content.actions,
				actionMetaCategories: content.actionMetaCategories,
				buildings: content.buildings,
				developments: content.developments,
				phases: [...content.phases],
				rules: content.rules,
				resourceCatalog: content.resourceCatalog as RuntimeResourceContent,
			};
		}

		if (config !== undefined) {
			sessionOptions.config = config;
		}
		const session = createEngineSession(sessionOptions);
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
		}
	}
}
