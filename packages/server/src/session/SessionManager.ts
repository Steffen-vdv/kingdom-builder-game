import {
	createEngineSession,
	type EngineSession,
} from '@kingdom-builder/engine';
import {
	ACTIONS,
	BUILDINGS,
	DEVELOPMENTS,
	POPULATIONS,
	PHASES,
	GAME_START,
	RULES,
	RESOURCES,
	STATS,
	TRIGGER_INFO,
	OVERVIEW_CONTENT,
} from '@kingdom-builder/contents';
import type {
	PlayerStartConfig,
	Registry,
	SerializedRegistry,
	SessionRegistriesPayload,
	SessionResourceDefinition,
	SessionRegistriesMetadata,
	SessionMetadataDescriptor,
} from '@kingdom-builder/protocol';
type EngineSessionOptions = Parameters<typeof createEngineSession>[0];

type EngineSessionBaseOptions = Omit<
	EngineSessionOptions,
	'devMode' | 'config'
>;

type SessionResourceRegistry = SerializedRegistry<SessionResourceDefinition>;

type EngineSessionOverrideOptions = Partial<EngineSessionBaseOptions> & {
	resourceRegistry?: SessionResourceRegistry;
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

	private readonly baseOptions: EngineSessionBaseOptions;

	private readonly registries: SessionRegistriesPayload;

	public constructor(options: SessionManagerOptions = {}) {
		const {
			maxIdleDurationMs = DEFAULT_MAX_IDLE_DURATION_MS,
			maxSessions,
			now = Date.now,
			engineOptions = {},
		} = options;
		const { resourceRegistry, ...engineOverrides } = engineOptions;
		this.maxIdleDurationMs = maxIdleDurationMs;
		this.maxSessions = maxSessions;
		this.now = now;
		this.baseOptions = {
			actions: engineOverrides.actions ?? ACTIONS,
			buildings: engineOverrides.buildings ?? BUILDINGS,
			developments: engineOverrides.developments ?? DEVELOPMENTS,
			populations: engineOverrides.populations ?? POPULATIONS,
			phases: engineOverrides.phases ?? PHASES,
			start: engineOverrides.start ?? GAME_START,
			rules: engineOverrides.rules ?? RULES,
		};
		this.registries = {
			actions: this.cloneRegistry(this.baseOptions.actions),
			buildings: this.cloneRegistry(this.baseOptions.buildings),
			developments: this.cloneRegistry(this.baseOptions.developments),
			populations: this.cloneRegistry(this.baseOptions.populations),
			resources: this.buildResourceRegistry(resourceRegistry),
			metadata: this.buildMetadata(),
		};
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
		const sessionOptions: EngineSessionOptions = {
			...this.baseOptions,
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

	private requireSession(sessionId: string): EngineSession {
		const session = this.getSession(sessionId);
		if (!session) {
			throw new Error(`Session "${sessionId}" was not found.`);
		}
		return session;
	}

	private cloneRegistry<DefinitionType>(
		registry: Registry<DefinitionType>,
	): SerializedRegistry<DefinitionType> {
		const entries = registry.entries();
		const result: SerializedRegistry<DefinitionType> = {};
		for (const [id, definition] of entries) {
			result[id] = structuredClone(definition);
		}
		return result;
	}

	private buildDescriptorMap(
		entries: Record<
			string,
			{ label?: string; icon?: string; description?: string }
		>,
	): Record<string, SessionMetadataDescriptor> {
		return Object.fromEntries(
			Object.entries(entries).map(([id, descriptor]) => {
				const metadata: SessionMetadataDescriptor = {};
				if (descriptor.label !== undefined) {
					metadata.label = descriptor.label;
				}
				if (descriptor.icon !== undefined) {
					metadata.icon = descriptor.icon;
				}
				if (descriptor.description !== undefined) {
					metadata.description = descriptor.description;
				}
				return [id, metadata];
			}),
		);
	}

	private buildTriggerMetadata(): NonNullable<
		SessionRegistriesMetadata['triggers']
	> {
		const triggerEntries = Object.entries(
			TRIGGER_INFO as Record<
				string,
				{ icon?: string; future?: string; past?: string }
			>,
		);
		return Object.fromEntries(
			triggerEntries.map(([id, info]) => [
				id,
				{
					label: info.past ?? info.future ?? id,
					...(info.icon !== undefined ? { icon: info.icon } : {}),
					...(info.future !== undefined ? { future: info.future } : {}),
					...(info.past !== undefined ? { past: info.past } : {}),
				},
			]),
		) as NonNullable<SessionRegistriesMetadata['triggers']>;
	}

	private buildMetadata(): SessionRegistriesMetadata {
		return {
			resources: this.buildDescriptorMap(RESOURCES),
			stats: this.buildDescriptorMap(STATS),
			triggers: this.buildTriggerMetadata(),
			overviewContent: structuredClone(OVERVIEW_CONTENT),
		} satisfies SessionRegistriesMetadata;
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
