import {
	createEngineSession,
	type EngineSession,
} from '@kingdom-builder/engine';
import {
	ACTIONS,
	BUILDINGS,
	DEVELOPMENTS,
	POPULATIONS,
	RESOURCES,
	PHASES,
	GAME_START,
	RULES,
} from '@kingdom-builder/contents';
import type { ResourceDefinition } from '@kingdom-builder/protocol';
type EngineSessionOptions = Parameters<typeof createEngineSession>[0];

type EngineSessionBaseOptions = Omit<
	EngineSessionOptions,
	'devMode' | 'config'
>;

type SessionManagerEngineOptions = Partial<EngineSessionBaseOptions> & {
	resources?: Record<string, ResourceDefinition>;
};

type SessionBaseRegistries = {
	actions: EngineSessionBaseOptions['actions'];
	buildings: EngineSessionBaseOptions['buildings'];
	developments: EngineSessionBaseOptions['developments'];
	populations: EngineSessionBaseOptions['populations'];
	resources: Record<string, ResourceDefinition>;
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
	engineOptions?: SessionManagerEngineOptions;
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

	private readonly resourceDefinitions: Record<string, ResourceDefinition>;

	public constructor(options: SessionManagerOptions = {}) {
		const {
			maxIdleDurationMs = DEFAULT_MAX_IDLE_DURATION_MS,
			maxSessions,
			now = Date.now,
			engineOptions = {},
		} = options;
		this.maxIdleDurationMs = maxIdleDurationMs;
		this.maxSessions = maxSessions;
		this.now = now;
		const actions = engineOptions.actions ?? ACTIONS;
		const buildings = engineOptions.buildings ?? BUILDINGS;
		const developments = engineOptions.developments ?? DEVELOPMENTS;
		const populations = engineOptions.populations ?? POPULATIONS;
		this.baseOptions = {
			actions,
			buildings,
			developments,
			populations,
			phases: engineOptions.phases ?? PHASES,
			start: engineOptions.start ?? GAME_START,
			rules: engineOptions.rules ?? RULES,
		};
		if (engineOptions.resources) {
			this.resourceDefinitions = this.cloneResourceDefinitions(
				engineOptions.resources,
			);
		} else {
			this.resourceDefinitions = this.cloneResourceDefinitions(RESOURCES);
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

	public getBaseRegistries(): SessionBaseRegistries {
		return {
			actions: this.baseOptions.actions,
			buildings: this.baseOptions.buildings,
			developments: this.baseOptions.developments,
			populations: this.baseOptions.populations,
			resources: this.cloneResourceDefinitions(this.resourceDefinitions),
		};
	}

	private requireSession(sessionId: string): EngineSession {
		const session = this.getSession(sessionId);
		if (!session) {
			throw new Error(`Session "${sessionId}" was not found.`);
		}
		return session;
	}

	private cloneResourceDefinitions<Definition extends ResourceDefinition>(
		definitions: Record<string, Definition>,
	): Record<string, ResourceDefinition> {
		const cloned: Record<string, ResourceDefinition> = {};
		for (const [key, definition] of Object.entries(definitions)) {
			cloned[key] = structuredClone(definition);
		}
		return cloned;
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
