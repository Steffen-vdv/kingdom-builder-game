import type { EngineSession } from '@kingdom-builder/engine';
import {
	ACTIONS,
	ACTION_CATEGORIES,
	BUILDINGS,
	DEVELOPMENTS,
	POPULATIONS,
	PHASES,
	GAME_START,
	RULES,
	PRIMARY_ICON_ID,
} from '@kingdom-builder/contents';
import type {
	SessionRegistriesPayload,
	PhaseConfig,
	StartConfig,
	RuleSet,
	SessionActionCategoryRegistry,
} from '@kingdom-builder/protocol';
import {
	buildSessionMetadata,
	type SessionStaticMetadataPayload,
} from './buildSessionMetadata.js';
import {
	cloneActionCategoryRegistry,
	cloneRegistry,
	freezeSerializedRegistry,
} from './registryUtils.js';
import {
	buildSessionAssets,
	buildResourceRegistry,
	type SessionBaseOptions,
	type SessionResourceRegistry,
} from './sessionConfigAssets.js';
import type { SessionStore } from './SessionStore.js';
import {
	attachDevModePersistence,
	createEngineSessionWithOptions,
	hydratePersistedSessions,
	persistSessionRecord,
	type EngineSessionOptions,
	type SessionRecord,
} from './SessionPersistenceHelpers.js';
type EngineSessionOverrideOptions = Partial<SessionBaseOptions> & {
	resourceRegistry?: SessionResourceRegistry;
	actionCategoryRegistry?: SessionActionCategoryRegistry;
	primaryIconId?: string | null;
};

type SessionRuntimeConfig = {
	phases: PhaseConfig[];
	start: StartConfig;
	rules: RuleSet;
	resources: SessionResourceRegistry;
	primaryIconId: string | null;
};

export interface SessionManagerOptions {
	maxIdleDurationMs?: number;
	maxSessions?: number;
	now?: () => number;
	engineOptions?: EngineSessionOverrideOptions;
	store?: SessionStore;
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

	private readonly sessionStore: SessionStore | undefined;

	private readonly runtimeConfig: SessionRuntimeConfig;

	public constructor(options: SessionManagerOptions = {}) {
		const {
			maxIdleDurationMs = DEFAULT_MAX_IDLE_DURATION_MS,
			maxSessions,
			now = Date.now,
			engineOptions = {},
			store,
		} = options;
		const {
			resourceRegistry,
			actionCategoryRegistry,
			primaryIconId: primaryIconOverride,
			...engineOverrides
		} = engineOptions;
		this.maxIdleDurationMs = maxIdleDurationMs;
		this.maxSessions = maxSessions;
		this.now = now;
		this.sessionStore = store;
		const baseActionCategories =
			engineOverrides.actionCategories ?? ACTION_CATEGORIES;
		this.baseOptions = {
			actions: engineOverrides.actions ?? ACTIONS,
			actionCategories: baseActionCategories,
			buildings: engineOverrides.buildings ?? BUILDINGS,
			developments: engineOverrides.developments ?? DEVELOPMENTS,
			populations: engineOverrides.populations ?? POPULATIONS,
			phases: engineOverrides.phases ?? PHASES,
			start: engineOverrides.start ?? GAME_START,
			rules: engineOverrides.rules ?? RULES,
		};
		const primaryIconId = primaryIconOverride ?? PRIMARY_ICON_ID ?? null;
		const resourceOverrideSnapshot = resourceRegistry
			? freezeSerializedRegistry(structuredClone(resourceRegistry))
			: undefined;
		this.resourceOverrides = resourceOverrideSnapshot;
		const resources = buildResourceRegistry(
			this.resourceOverrides,
			this.baseOptions.start,
		);
		const actionCategories = actionCategoryRegistry
			? (freezeSerializedRegistry(
					structuredClone(actionCategoryRegistry),
				) as SessionActionCategoryRegistry)
			: (freezeSerializedRegistry(
					cloneActionCategoryRegistry(this.baseOptions.actionCategories),
				) as SessionActionCategoryRegistry);
		this.registries = {
			actions: cloneRegistry(this.baseOptions.actions),
			actionCategories,
			buildings: cloneRegistry(this.baseOptions.buildings),
			developments: cloneRegistry(this.baseOptions.developments),
			populations: cloneRegistry(this.baseOptions.populations),
			resources,
		};
		this.metadata = buildSessionMetadata({
			buildings: this.baseOptions.buildings,
			developments: this.baseOptions.developments,
			populations: this.baseOptions.populations,
			resources,
			phases: this.baseOptions.phases,
		});
		const frozenPhases = Object.freeze(
			structuredClone(this.baseOptions.phases),
		) as unknown as PhaseConfig[];
		const frozenStart = Object.freeze(
			structuredClone(this.baseOptions.start),
		) as unknown as StartConfig;
		const frozenRules = Object.freeze(
			structuredClone(this.baseOptions.rules),
		) as unknown as RuleSet;
		const frozenResources = freezeSerializedRegistry(
			structuredClone(resources),
		) as SessionResourceRegistry;
		this.runtimeConfig = Object.freeze({
			phases: frozenPhases,
			start: frozenStart,
			rules: frozenRules,
			resources: frozenResources,
			primaryIconId,
		});
		const restoredSessions = hydratePersistedSessions(
			this.sessionStore,
			this.baseOptions,
		);
		for (const [restoredId, record] of restoredSessions) {
			this.sessions.set(restoredId, record);
			attachDevModePersistence(
				restoredId,
				record.session,
				this.sessions,
				this.sessionStore,
			);
		}
	}

	public createSession(
		sessionId: string,
		options: CreateSessionOptions = {},
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
		const configSnapshot =
			options.config !== undefined
				? structuredClone(options.config)
				: undefined;
		const session = createEngineSessionWithOptions(
			this.baseOptions,
			devMode,
			configSnapshot,
		);
		const timestamp = this.now();
		const { registries, metadata } = buildSessionAssets(
			{
				baseOptions: this.baseOptions,
				resourceOverrides: this.resourceOverrides,
				baseRegistries: this.registries,
				baseMetadata: this.metadata,
			},
			configSnapshot,
		);
		const record: SessionRecord = {
			session,
			createdAt: timestamp,
			lastAccessedAt: timestamp,
			registries,
			metadata,
			devMode,
			...(configSnapshot !== undefined ? { config: configSnapshot } : {}),
		};
		this.sessions.set(sessionId, record);
		attachDevModePersistence(
			sessionId,
			session,
			this.sessions,
			this.sessionStore,
		);
		persistSessionRecord(this.sessionStore, sessionId, record);
		return session;
	}

	public getSession(sessionId: string): EngineSession | undefined {
		this.purgeExpiredSessions();
		const record = this.sessions.get(sessionId);
		if (!record) {
			return undefined;
		}
		record.lastAccessedAt = this.now();
		persistSessionRecord(this.sessionStore, sessionId, record);
		return record.session;
	}

	public destroySession(sessionId: string): boolean {
		const removed = this.sessions.delete(sessionId);
		if (removed) {
			this.sessionStore?.delete(sessionId);
		}
		return removed;
	}

	public getSnapshot(
		sessionId: string,
	): ReturnType<EngineSession['getSnapshot']> {
		const session = this.requireSession(sessionId);
		return session.getSnapshot();
	}

	public getRuleSnapshot(
		sessionId: string,
	): ReturnType<EngineSession['getRuleSnapshot']> {
		const session = this.requireSession(sessionId);
		return session.getRuleSnapshot();
	}

	public getSessionCount(): number {
		this.purgeExpiredSessions();
		return this.sessions.size;
	}

	public getRegistries(): SessionRegistriesPayload {
		return structuredClone(this.registries);
	}

	public getMetadata(): SessionStaticMetadataPayload {
		return structuredClone(this.metadata);
	}

	public getSessionRegistries(sessionId: string): SessionRegistriesPayload {
		const record = this.requireSessionRecord(sessionId);
		return structuredClone(record.registries);
	}

	public getSessionMetadata(sessionId: string): SessionStaticMetadataPayload {
		const record = this.requireSessionRecord(sessionId);
		return structuredClone(record.metadata);
	}

	public getRuntimeConfig(): SessionRuntimeConfig {
		return this.runtimeConfig;
	}

	private requireSession(sessionId: string): EngineSession {
		const session = this.getSession(sessionId);
		if (!session) {
			throw new Error(`Session "${sessionId}" was not found.`);
		}
		return session;
	}

	private requireSessionRecord(sessionId: string): SessionRecord {
		const record = this.sessions.get(sessionId);
		if (!record) {
			throw new Error(`Session "${sessionId}" was not found.`);
		}
		return record;
	}

	private purgeExpiredSessions(): void {
		const expiration = this.now() - this.maxIdleDurationMs;
		for (const [sessionId, record] of this.sessions.entries()) {
			if (record.lastAccessedAt < expiration) {
				this.sessions.delete(sessionId);
				this.sessionStore?.delete(sessionId);
			}
		}
	}
}

export type { SessionStaticMetadataPayload } from './buildSessionMetadata.js';
export type { SessionRuntimeConfig };
