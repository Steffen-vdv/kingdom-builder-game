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
	RESOURCES,
	RULES,
} from '@kingdom-builder/contents';
import type { SessionRegistryPayload } from '@kingdom-builder/protocol';
type EngineSessionOptions = Parameters<typeof createEngineSession>[0];

type EngineSessionBaseOptions = Omit<
	EngineSessionOptions,
	'devMode' | 'config'
>;

type SessionRecord = {
	session: EngineSession;
	createdAt: number;
	lastAccessedAt: number;
};

const globalClone = (
	globalThis as {
		structuredClone?: <T>(value: T) => T;
	}
).structuredClone;

function jsonClone<T>(value: T): T {
	return JSON.parse(JSON.stringify(value)) as T;
}

const cloneStructured: <T>(value: T) => T = globalClone
	? (value) => globalClone(value)
	: jsonClone;

function cloneValue<T>(value: T): T {
	return cloneStructured(value);
}

function cloneRegistry<Definition>(registry: {
	entries(): Array<[string, Definition]>;
}): Record<string, Definition> {
	const entries = registry
		.entries()
		.map(([id, definition]) => [id, cloneValue(definition)] as const);
	return Object.fromEntries(entries) as Record<string, Definition>;
}

function cloneRecord<Definition>(
	record: Record<string, Definition>,
): Record<string, Definition> {
	const entries = Object.entries(record).map(
		([key, value]) => [key, cloneValue(value)] as const,
	);
	return Object.fromEntries(entries) as Record<string, Definition>;
}

export interface SessionManagerOptions {
	maxIdleDurationMs?: number;
	maxSessions?: number;
	now?: () => number;
	engineOptions?: Partial<EngineSessionBaseOptions>;
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

	private readonly registrySnapshot: SessionRegistryPayload;

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
		this.baseOptions = {
			actions: engineOptions.actions ?? ACTIONS,
			buildings: engineOptions.buildings ?? BUILDINGS,
			developments: engineOptions.developments ?? DEVELOPMENTS,
			populations: engineOptions.populations ?? POPULATIONS,
			phases: engineOptions.phases ?? PHASES,
			start: engineOptions.start ?? GAME_START,
			rules: engineOptions.rules ?? RULES,
		};
		const resourceRecord = RESOURCES as Record<
			string,
			SessionRegistryPayload['resources'][string]
		>;
		this.registrySnapshot = {
			actions: cloneRegistry(this.baseOptions.actions),
			buildings: cloneRegistry(this.baseOptions.buildings),
			developments: cloneRegistry(this.baseOptions.developments),
			populations: cloneRegistry(this.baseOptions.populations),
			resources: cloneRecord(resourceRecord),
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

	public getRegistries(): SessionRegistryPayload {
		return cloneValue(this.registrySnapshot);
	}

	private requireSession(sessionId: string): EngineSession {
		const session = this.getSession(sessionId);
		if (!session) {
			throw new Error(`Session "${sessionId}" was not found.`);
		}
		return session;
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
