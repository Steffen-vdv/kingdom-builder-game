import {
	createEngineSession,
	type EngineSession,
} from '@kingdom-builder/engine';
import type {
	SessionRegistriesPayload,
	ActionParametersPayload,
	SessionPlayerId,
} from '@kingdom-builder/protocol';
import type { SessionStaticMetadataPayload } from './buildSessionMetadata.js';
import {
	buildSessionAssets,
	type SessionBaseOptions,
	type SessionResourceRegistry,
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
	devMode?: EngineSessionOptions['devMode'];
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
	private readonly resourceOverrides: SessionResourceRegistry | undefined;
	private readonly runtimeConfig: SessionRuntimeConfig;
	private readonly persistence: SessionPersistence | undefined;
	private readonly restorer: SessionRestorer | undefined;

	public constructor(options: SessionManagerOptions = {}) {
		const {
			maxIdleDurationMs = DEFAULT_MAX_IDLE_DURATION_MS,
			maxSessions,
			now = Date.now,
			engineOptions = {},
			persistence,
		} = options;
		this.persistence = persistence;
		this.maxIdleDurationMs = maxIdleDurationMs;
		this.maxSessions = maxSessions;
		this.now = now;
		const config = buildSessionManagerConfig(engineOptions);
		this.baseOptions = config.baseOptions;
		this.registries = config.registries;
		this.metadata = config.metadata;
		this.resourceOverrides = config.resourceOverrides;
		this.runtimeConfig = config.runtimeConfig;
		if (persistence) {
			const { actionCategories: _, ...restoreBaseOptions } = this.baseOptions;
			this.restorer = new SessionRestorer({
				persistence,
				baseOptions: restoreBaseOptions,
			});
		}
	}

	public createSession(
		sessionId: string,
		options: CreateSessionOptions = {},
		playerNames?: Partial<Record<SessionPlayerId, string>>,
	): EngineSession {
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
		const devMode = options.devMode ?? false;
		const { config } = options;
		const { actionCategories: _baseActionCategories, ...engineBaseOptions } =
			this.baseOptions;
		const sessionOptions: EngineSessionOptions = {
			...engineBaseOptions,
			devMode,
		};
		if (config !== undefined) {
			sessionOptions.config = config;
		}
		const session = createEngineSession(sessionOptions);
		session.setDevMode(devMode);
		const timestamp = this.now();
		const { registries, metadata } = buildSessionAssets(
			{
				baseOptions: this.baseOptions,
				resourceOverrides: this.resourceOverrides,
				baseRegistries: this.registries,
				baseMetadata: this.metadata,
			},
			config,
		);
		const creationOptions: SessionCreationOptions = { devMode };
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

	public getSession(sessionId: string): EngineSession | undefined {
		this.purgeExpiredSessions();
		let record = this.sessions.get(sessionId);
		if (!record) {
			// Try to restore from persistence
			record = this.tryRestoreFromPersistence(sessionId);
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

	/** Records a dev mode change for persistence. */
	public recordDevModeChange(sessionId: string, enabled: boolean): void {
		const record = this.sessions.get(sessionId);
		if (!record) {
			return;
		}
		const recObj = this.makeRecorderObject(record);
		recorder.recordDevModeChange(sessionId, recObj, this.persistence, enabled);
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

	public getSnapshot(sessionId: string) {
		const session = this.getSession(sessionId);
		return session ? session.getSnapshot() : undefined;
	}

	public getRuleSnapshot(sessionId: string) {
		const session = this.getSession(sessionId);
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
	private tryRestoreFromPersistence(
		sessionId: string,
	): SessionRecord | undefined {
		if (!this.restorer || !this.persistence) {
			return undefined;
		}
		const restored = this.restorer.restore(sessionId);
		if (!restored) {
			return undefined;
		}
		const timestamp = this.now();
		const { registries, metadata } = buildSessionAssets(
			{
				baseOptions: this.baseOptions,
				resourceOverrides: this.resourceOverrides,
				baseRegistries: this.registries,
				baseMetadata: this.metadata,
			},
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
