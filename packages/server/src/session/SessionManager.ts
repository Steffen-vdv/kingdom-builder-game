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
	RESOURCES,
	PRIMARY_ICON_ID,
	type ActionCategoryConfig as ContentActionCategoryConfig,
} from '@kingdom-builder/contents';
import type {
	PlayerStartConfig,
	Registry,
	SerializedRegistry,
	SessionRegistriesPayload,
	SessionResourceDefinition,
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
type EngineSessionOptions = Parameters<typeof createEngineSession>[0];

type EngineSessionBaseOptions = Omit<
	EngineSessionOptions,
	'devMode' | 'config'
>;

type SessionBaseOptions = EngineSessionBaseOptions & {
	actionCategories: Registry<ContentActionCategoryConfig>;
};

type SessionResourceRegistry = SerializedRegistry<SessionResourceDefinition>;

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

type SessionRecord = {
	session: EngineSession;
	createdAt: number;
	lastAccessedAt: number;
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
			populations: engineOverrides.populations ?? POPULATIONS,
			phases: engineOverrides.phases ?? PHASES,
			start: engineOverrides.start ?? GAME_START,
			rules: engineOverrides.rules ?? RULES,
		};
		const primaryIconId = primaryIconOverride ?? PRIMARY_ICON_ID ?? null;
		const resources = this.buildResourceRegistry(resourceRegistry);
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
		this.sessions.set(sessionId, {
			session,
			createdAt: timestamp,
			lastAccessedAt: timestamp,
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

	private buildResourceRegistry(
		overrides?: SessionResourceRegistry,
	): SessionResourceRegistry {
		const registry = new Map<string, SessionResourceDefinition>();
		const applyOverride = (
			source: SessionResourceRegistry | undefined,
		): void => {
			if (!source) {
				return;
			}
			for (const [key, definition] of Object.entries(source)) {
				registry.set(key, structuredClone(definition));
			}
		};
		applyOverride(overrides);
		const addKey = (key: string): void => {
			if (registry.has(key)) {
				return;
			}
			const info = RESOURCES[key as keyof typeof RESOURCES];
			if (info) {
				const definition: SessionResourceDefinition = {
					key: info.key,
					icon: info.icon,
					label: info.label,
					description: info.description,
				};
				if (info.tags && info.tags.length > 0) {
					definition.tags = [...info.tags];
				}
				registry.set(key, definition);
				return;
			}
			registry.set(key, { key });
		};
		const addFromStart = (config: PlayerStartConfig | undefined): void => {
			if (!config?.resources) {
				return;
			}
			for (const key of Object.keys(config.resources)) {
				addKey(key);
			}
		};
		const { start } = this.baseOptions;
		addFromStart(start.player);
		if (start.players) {
			for (const playerConfig of Object.values(start.players)) {
				addFromStart(playerConfig);
			}
		}
		if (start.modes) {
			for (const mode of Object.values(start.modes)) {
				if (!mode) {
					continue;
				}
				addFromStart(mode.player);
				if (mode.players) {
					for (const modePlayer of Object.values(mode.players)) {
						addFromStart(modePlayer);
					}
				}
			}
		}
		return Object.fromEntries(registry.entries());
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
