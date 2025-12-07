import {
	createEngineSession,
	type EngineSession,
} from '@kingdom-builder/engine';
import {
	ACTIONS,
	ACTION_CATEGORIES,
	BUILDINGS,
	DEVELOPMENTS,
	PHASES,
	RULES,
	PRIMARY_ICON_ID,
} from '@kingdom-builder/contents';
import {
	RESOURCE_REGISTRY,
	RESOURCE_GROUP_REGISTRY,
	RESOURCE_CATEGORY_REGISTRY,
} from '@kingdom-builder/contents/registries/resource';
import type {
	SessionRegistriesPayload,
	PhaseConfig,
	RuleSet,
	SessionActionCategoryRegistry,
	SerializedRegistry,
	ResourceDefinition,
	ResourceGroupDefinition,
	ResourceCategoryDefinition,
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
	type SessionBaseOptions,
	type SessionResourceRegistry,
} from './sessionConfigAssets.js';
type EngineSessionOptions = Parameters<typeof createEngineSession>[0];

type EngineSessionOverrideOptions = Partial<SessionBaseOptions> & {
	resourceRegistry?: SessionResourceRegistry;
	actionCategoryRegistry?: SessionActionCategoryRegistry;
	primaryIconId?: string | null;
};

type SessionRuntimeConfig = {
	phases: PhaseConfig[];
	rules: RuleSet;
	primaryIconId: string | null;
	resources: SerializedRegistry<ResourceDefinition>;
	resourceGroups: SerializedRegistry<ResourceGroupDefinition>;
	resourceCategories: SerializedRegistry<ResourceCategoryDefinition>;
};

type SessionRecord = {
	session: EngineSession;
	createdAt: number;
	lastAccessedAt: number;
	registries: SessionRegistriesPayload;
	metadata: SessionStaticMetadataPayload;
};

export interface SessionManagerOptions {
	maxIdleDurationMs?: number;
	maxSessions?: number;
	now?: () => number;
	engineOptions?: EngineSessionOverrideOptions;
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

	public constructor(options: SessionManagerOptions = {}) {
		const {
			maxIdleDurationMs = DEFAULT_MAX_IDLE_DURATION_MS,
			maxSessions,
			now = Date.now,
			engineOptions = {},
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
		const baseActionCategories =
			engineOverrides.actionCategories ?? ACTION_CATEGORIES;
		this.baseOptions = {
			actions: engineOverrides.actions ?? ACTIONS,
			actionCategories: baseActionCategories,
			buildings: engineOverrides.buildings ?? BUILDINGS,
			developments: engineOverrides.developments ?? DEVELOPMENTS,
			phases: engineOverrides.phases ?? PHASES,
			rules: engineOverrides.rules ?? RULES,
			resourceCatalog: engineOverrides.resourceCatalog ?? {
				resources: RESOURCE_REGISTRY,
				groups: RESOURCE_GROUP_REGISTRY,
				categories: RESOURCE_CATEGORY_REGISTRY,
			},
			...(engineOverrides.systemActionIds
				? { systemActionIds: engineOverrides.systemActionIds }
				: {}),
		};
		const primaryIconId = primaryIconOverride ?? PRIMARY_ICON_ID ?? null;
		const resourceOverrideSnapshot = resourceRegistry
			? freezeSerializedRegistry(structuredClone(resourceRegistry))
			: undefined;
		this.resourceOverrides = resourceOverrideSnapshot;
		const resourceCatalog = this.baseOptions.resourceCatalog;
		const resources = freezeSerializedRegistry(
			structuredClone(resourceCatalog.resources.byId),
		);
		const resourceGroups = freezeSerializedRegistry(
			structuredClone(resourceCatalog.groups.byId),
		);
		const resourceCategories = freezeSerializedRegistry(
			structuredClone(resourceCatalog.categories?.byId ?? {}),
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
			resources,
			resourceGroups,
			resourceCategories,
		};
		this.metadata = buildSessionMetadata({
			buildings: this.baseOptions.buildings,
			developments: this.baseOptions.developments,
			resources,
			phases: this.baseOptions.phases,
		});
		const frozenPhases = Object.freeze(
			structuredClone(this.baseOptions.phases),
		) as unknown as PhaseConfig[];
		const frozenRules = Object.freeze(
			structuredClone(this.baseOptions.rules),
		) as unknown as RuleSet;
		this.runtimeConfig = Object.freeze({
			phases: frozenPhases,
			rules: frozenRules,
			primaryIconId,
			resources,
			resourceGroups,
			resourceCategories,
		});
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
		this.sessions.set(sessionId, {
			session,
			createdAt: timestamp,
			lastAccessedAt: timestamp,
			registries,
			metadata,
		});
		return session;
	}

	public getSession(sessionId: string): EngineSession | undefined {
		this.purgeExpiredSessions();
		const record = this.sessions.get(sessionId);
		if (!record) {
			return undefined;
		}
		record.lastAccessedAt = this.now();
		return record.session;
	}

	public destroySession(sessionId: string): boolean {
		return this.sessions.delete(sessionId);
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
			}
		}
	}
}

export type { SessionStaticMetadataPayload } from './buildSessionMetadata.js';
export type { SessionRuntimeConfig };
