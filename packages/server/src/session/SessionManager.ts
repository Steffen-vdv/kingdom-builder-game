import {
	createEngineSession,
	type EngineSession,
	type RuntimeResourceContent,
} from '@boardsmith/engine';
import type {
	SessionRegistriesPayload,
	ActionParametersPayload,
	SessionPlayerId,
} from '@boardsmith/protocol';
import { loadContentPackage, DEFAULT_CONTENT_ID } from '@boardsmith/contents';
import type { SessionStaticMetadataPayload } from './buildSessionMetadata.js';
import {
	buildSessionAssets,
	type SessionBaseOptions,
} from './sessionConfigAssets.js';
import type {
	SessionPersistence,
	ActionLogEntry,
	SessionCreationOptions,
} from './SessionPersistence.js';
import { SessionRestorer } from './SessionRestorer.js';
import * as recorder from './SessionRecorder.js';
import {
	buildSessionManagerConfig,
	type EngineSessionOverrideOptions,
	type SessionRuntimeConfig,
} from './SessionManagerConfig.js';
type EngineSessionOptions = Parameters<typeof createEngineSession>[0];

type SessionRecord = {
	session: EngineSession;
	createdAt: number;
	lastAccessedAt: number;
	registries: SessionRegistriesPayload;
	metadata: SessionStaticMetadataPayload;
	creationOptions: SessionCreationOptions;
	actionLog: ActionLogEntry[];
};

export interface SessionManagerOptions {
	maxIdleDurationMs?: number;
	maxSessions?: number;
	now?: () => number;
	engineOptions?: EngineSessionOverrideOptions;
	persistence?: SessionPersistence;
}

export interface CreateSessionOptions {
	/** Content package identifier (e.g., "kingdom-builder:base") */
	contentId?: string;
	config?: EngineSessionOptions['config'];
}

const DEFAULT_MAX_IDLE_DURATION_MS = 15 * 60 * 1000;

export class SessionManager {
	private readonly sessions = new Map<string, SessionRecord>();
	private readonly maxIdleDurationMs: number;
	private readonly maxSessions: number | undefined;
	private readonly now: () => number;
	private readonly baseOptions: SessionBaseOptions;
	private readonly registries: SessionRegistriesPayload;
	private readonly metadata: SessionStaticMetadataPayload;
	private readonly runtimeConfig: SessionRuntimeConfig;
	private readonly persistence: SessionPersistence | undefined;
	private readonly restorer: SessionRestorer | undefined;
	/**
	 * When true, sessions use content from constructor's engineOptions
	 * rather than loading content packages dynamically.
	 * Used for testing with synthetic content.
	 */
	private readonly useStaticContent: boolean;

	public constructor(options: SessionManagerOptions = {}) {
		const {
			maxIdleDurationMs = DEFAULT_MAX_IDLE_DURATION_MS,
			maxSessions,
			now = Date.now,
			engineOptions,
			persistence,
		} = options;
		this.persistence = persistence;
		this.maxIdleDurationMs = maxIdleDurationMs;
		this.maxSessions = maxSessions;
		this.now = now;
		this.useStaticContent = engineOptions !== undefined;
		const config = buildSessionManagerConfig(engineOptions ?? {});
		this.baseOptions = config.baseOptions;
		this.registries = config.registries;
		this.metadata = config.metadata;
		this.runtimeConfig = config.runtimeConfig;
		if (persistence) {
			const { actionCategories: _, ...restoreBaseOptions } = this.baseOptions;
			this.restorer = new SessionRestorer({
				persistence,
				baseOptions: restoreBaseOptions,
			});
		}
	}

	public async createSession(
		sessionId: string,
		options: CreateSessionOptions = {},
		playerNames?: Partial<Record<SessionPlayerId, string>>,
	): Promise<EngineSession> {
		this.purgeExpiredSessions();
		if (this.sessions.has(sessionId)) {
			throw new Error(`Session "${sessionId}" already exists.`);
		}
		if (
			this.maxSessions !== undefined &&
			this.sessions.size >= this.maxSessions
		) {
			throw new Error('Maximum session count reached.');
		}
		const contentId = options.contentId ?? DEFAULT_CONTENT_ID;
		const { config } = options;

		let sessionOptions: EngineSessionOptions;
		let contentBaseOptions: SessionBaseOptions;

		if (this.useStaticContent) {
			// Use constructor-provided content (for testing with synthetic content)
			sessionOptions = {
				actions: this.baseOptions.actions,
				actionMetaCategories: this.baseOptions.actionMetaCategories,
				buildings: this.baseOptions.buildings,
				developments: this.baseOptions.developments,
				phases: this.baseOptions.phases,
				rules: this.baseOptions.rules,
				resourceCatalog: this.baseOptions.resourceCatalog,
			};
			contentBaseOptions = this.baseOptions;
		} else {
			// Load the content package dynamically
			const content = await loadContentPackage(contentId);
			sessionOptions = {
				actions: content.actions,
				actionMetaCategories: content.actionMetaCategories,
				buildings: content.buildings,
				developments: content.developments,
				phases: [...content.phases],
				rules: content.rules,
				resourceCatalog: content.resourceCatalog as RuntimeResourceContent,
			};
			contentBaseOptions = {
				actions: content.actions,
				actionMetaCategories: content.actionMetaCategories,
				actionCategories: content.actionCategories,
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
		const timestamp = this.now();

		const { registries, metadata } = buildSessionAssets(
			{ baseOptions: contentBaseOptions },
			config,
		);
		const creationOptions: SessionCreationOptions = { contentId };
		if (config !== undefined) {
			creationOptions.config = config;
		}
		if (playerNames !== undefined) {
			creationOptions.playerNames = playerNames;
		}
		const record: SessionRecord = {
			session,
			createdAt: timestamp,
			lastAccessedAt: timestamp,
			registries,
			metadata,
			creationOptions,
			actionLog: [],
		};
		this.sessions.set(sessionId, record);
		// Persist the new session if persistence is enabled
		if (this.persistence) {
			this.persistence.save({
				sessionId,
				creationOptions,
				actionLog: [],
				lastSnapshot: session.getSnapshot(),
				registries,
				metadata,
				lastAccessedAt: timestamp,
				createdAt: timestamp,
			});
		}
		return session;
	}

	public async getSession(
		sessionId: string,
	): Promise<EngineSession | undefined> {
		this.purgeExpiredSessions();
		let record = this.sessions.get(sessionId);
		if (!record) {
			// Try to restore from persistence
			record = await this.tryRestoreFromPersistence(sessionId);
			if (!record) {
				return undefined;
			}
		}
		record.lastAccessedAt = this.now();
		return record.session;
	}

	public destroySession(sessionId: string): boolean {
		const deleted = this.sessions.delete(sessionId);
		// Also delete from persistence
		if (this.persistence) {
			this.persistence.delete(sessionId);
		}
		return deleted;
	}

	/** Records an action for persistence. Call after performing an action. */
	public recordAction(
		sessionId: string,
		actionId: string,
		params?: ActionParametersPayload,
	): void {
		const record = this.sessions.get(sessionId);
		if (!record) {
			return;
		}
		const recObj = this.makeRecorderObject(record);
		recorder.recordAction(
			sessionId,
			recObj,
			this.persistence,
			actionId,
			params,
		);
	}

	/** Records a phase advance for persistence. */
	public recordAdvance(sessionId: string): void {
		const record = this.sessions.get(sessionId);
		if (!record) {
			return;
		}
		const recObj = this.makeRecorderObject(record);
		recorder.recordAdvance(sessionId, recObj, this.persistence);
	}

	/** Records a player name change for persistence. */
	public recordPlayerNameChange(
		sessionId: string,
		playerId: SessionPlayerId,
		name: string,
	): void {
		const record = this.sessions.get(sessionId);
		if (!record) {
			return;
		}
		const recObj = this.makeRecorderObject(record);
		recorder.recordPlayerNameChange(
			sessionId,
			recObj,
			this.persistence,
			playerId,
			name,
		);
	}

	private makeRecorderObject(
		record: SessionRecord,
	): recorder.SessionRecordWithLog {
		return {
			actionLog: record.actionLog,
			getSnapshot: () => record.session.getSnapshot(),
			registries: record.registries,
			metadata: record.metadata,
		};
	}

	/**
	 * Purges expired sessions from the database.
	 * Call this periodically to clean up old sessions.
	 */
	public purgeExpiredFromPersistence(): number {
		if (!this.persistence) {
			return 0;
		}
		return this.persistence.purgeExpired();
	}

	public async getSnapshot(sessionId: string) {
		const session = await this.getSession(sessionId);
		return session ? session.getSnapshot() : undefined;
	}

	public async getRuleSnapshot(sessionId: string) {
		const session = await this.getSession(sessionId);
		return session ? session.getRuleSnapshot() : undefined;
	}

	public getSessionCount(): number {
		this.purgeExpiredSessions();
		return this.sessions.size;
	}

	public getRegistries() {
		return structuredClone(this.registries);
	}
	public getMetadata() {
		return structuredClone(this.metadata);
	}
	public getRuntimeConfig() {
		return this.runtimeConfig;
	}

	public getSessionRegistries(
		sessionId: string,
	): SessionRegistriesPayload | undefined {
		const record = this.sessions.get(sessionId);
		return record ? structuredClone(record.registries) : undefined;
	}

	public getSessionMetadata(
		sessionId: string,
	): SessionStaticMetadataPayload | undefined {
		const record = this.sessions.get(sessionId);
		return record ? structuredClone(record.metadata) : undefined;
	}

	private purgeExpiredSessions(): void {
		const expiration = this.now() - this.maxIdleDurationMs;
		for (const [sessionId, record] of this.sessions.entries()) {
			if (record.lastAccessedAt < expiration) {
				this.sessions.delete(sessionId);
			}
		}
	}

	/**
	 * Attempts to restore a session from persistence.
	 */
	private async tryRestoreFromPersistence(
		sessionId: string,
	): Promise<SessionRecord | undefined> {
		if (!this.restorer || !this.persistence) {
			return undefined;
		}
		const restored = await this.restorer.restore(sessionId);
		if (!restored) {
			return undefined;
		}

		let contentBaseOptions: SessionBaseOptions;

		if (this.useStaticContent) {
			// Use constructor-provided content (for testing with synthetic content)
			contentBaseOptions = this.baseOptions;
		} else {
			// Load content package to build session assets
			const contentId =
				restored.creationOptions.contentId ?? DEFAULT_CONTENT_ID;
			const content = await loadContentPackage(contentId);
			contentBaseOptions = {
				actions: content.actions,
				actionMetaCategories: content.actionMetaCategories,
				actionCategories: content.actionCategories,
				buildings: content.buildings,
				developments: content.developments,
				phases: [...content.phases],
				rules: content.rules,
				resourceCatalog: content.resourceCatalog as RuntimeResourceContent,
			};
		}

		const timestamp = this.now();
		const { registries, metadata } = buildSessionAssets(
			{ baseOptions: contentBaseOptions },
			restored.creationOptions.config,
		);
		const record: SessionRecord = {
			session: restored.session,
			createdAt: restored.createdAt,
			lastAccessedAt: timestamp,
			registries,
			metadata,
			creationOptions: restored.creationOptions,
			actionLog: restored.actionLog,
		};
		this.sessions.set(sessionId, record);
		this.persistence.touch(sessionId);
		return record;
	}
}

export type { SessionStaticMetadataPayload } from './buildSessionMetadata.js';
export type { SessionRuntimeConfig };
