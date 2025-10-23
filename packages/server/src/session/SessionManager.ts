import {
	createEngineSession,
	type EngineSession,
} from '@kingdom-builder/engine';
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
	RESOURCE_V2_STARTUP_METADATA,
} from '@kingdom-builder/contents';
import type {
	SessionRegistriesPayload,
	PhaseConfig,
	StartConfig,
	RuleSet,
	SessionActionCategoryRegistry,
	SessionResourceV2DefinitionRegistry,
	SessionResourceV2GroupRegistry,
	ResourceV2Definition,
	ResourceV2GroupDefinition,
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
type EngineSessionOptions = Parameters<typeof createEngineSession>[0];

type EngineSessionOverrideOptions = Partial<SessionBaseOptions> & {
	resourceRegistry?: SessionResourceRegistry;
	actionCategoryRegistry?: SessionActionCategoryRegistry;
	resourceDefinitionRegistry?: SessionResourceV2DefinitionRegistry;
	resourceGroupRegistry?: SessionResourceV2GroupRegistry;
	primaryIconId?: string | null;
};

type SessionRuntimeConfig = {
	phases: PhaseConfig[];
	start: StartConfig;
	rules: RuleSet;
	resources: SessionResourceRegistry;
	primaryIconId: string | null;
	resourceDefinitions: SessionResourceV2DefinitionRegistry;
	resourceGroups: SessionResourceV2GroupRegistry;
};

type SessionRecord = {
	session: EngineSession;
	createdAt: number;
	lastAccessedAt: number;
	registries: SessionRegistriesPayload;
	metadata: SessionStaticMetadataPayload;
};

function normalizeResourceDefinitionRegistry(
	override: SessionResourceV2DefinitionRegistry | undefined,
	fallback: ReadonlyArray<ResourceV2Definition> | undefined,
): SessionResourceV2DefinitionRegistry {
	const source = override ?? fallback ?? [];
	const cloned = source.map((definition) =>
		Object.freeze(structuredClone(definition)),
	);
	return Object.freeze(cloned) as SessionResourceV2DefinitionRegistry;
}

function normalizeResourceGroupRegistry(
	override: SessionResourceV2GroupRegistry | undefined,
	fallback: ReadonlyArray<ResourceV2GroupDefinition> | undefined,
): SessionResourceV2GroupRegistry {
	const source = override ?? fallback ?? [];
	const cloned = source.map((group) => Object.freeze(structuredClone(group)));
	return Object.freeze(cloned) as SessionResourceV2GroupRegistry;
}

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

	private readonly resourceDefinitions: SessionResourceV2DefinitionRegistry;

	private readonly resourceGroups: SessionResourceV2GroupRegistry;

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
			resourceDefinitionRegistry,
			resourceGroupRegistry,
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
		const resourceDefinitions = normalizeResourceDefinitionRegistry(
			resourceDefinitionRegistry,
			RESOURCE_V2_STARTUP_METADATA.definitions.orderedDefinitions,
		);
		const resourceGroups = normalizeResourceGroupRegistry(
			resourceGroupRegistry,
			RESOURCE_V2_STARTUP_METADATA.groups.orderedGroups,
		);
		this.resourceDefinitions = resourceDefinitions;
		this.resourceGroups = resourceGroups;
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
			resourceDefinitions,
			resourceGroups,
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
			resourceDefinitions,
			resourceGroups,
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
				resourceDefinitions: this.resourceDefinitions,
				resourceGroups: this.resourceGroups,
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
		const snapshot = session.getSnapshot();
		for (const player of snapshot.game.players) {
			if (!player.values) {
				player.values = {};
			}
		}
		return snapshot;
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
