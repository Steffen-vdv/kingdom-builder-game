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
	type OverviewContentTemplate,
} from '@kingdom-builder/contents';
import type {
	SessionRegistriesPayload,
	SessionSnapshotMetadata,
} from '@kingdom-builder/protocol/session';
import { buildSessionMetadata } from './sessionMetadataBuilder.js';
type EngineSessionOptions = Parameters<typeof createEngineSession>[0];

type EngineSessionBaseOptions = Omit<
	EngineSessionOptions,
	'devMode' | 'config'
>;

type EngineSessionOverrideOptions = Partial<EngineSessionBaseOptions> & {
	resourceRegistry?: SessionRegistriesPayload['resources'];
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

	private readonly staticMetadata: Partial<SessionSnapshotMetadata>;

	private readonly overviewContent: OverviewContentTemplate;

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
		const built = buildSessionMetadata({
			actions: this.baseOptions.actions,
			buildings: this.baseOptions.buildings,
			developments: this.baseOptions.developments,
			populations: this.baseOptions.populations,
			phases: this.baseOptions.phases,
			startConfig: this.baseOptions.start,
			...(resourceRegistry !== undefined ? { resourceRegistry } : {}),
		});
		this.registries = built.registries;
		this.staticMetadata = built.metadata;
		this.overviewContent = built.overviewContent;
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
		const snapshot = session.getSnapshot();
		snapshot.metadata = this.mergeMetadata(snapshot.metadata);
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

	private requireSession(sessionId: string): EngineSession {
		const session = this.getSession(sessionId);
		if (!session) {
			throw new Error(`Session "${sessionId}" was not found.`);
		}
		return session;
	}

	private mergeMetadata(
		metadata: SessionSnapshotMetadata,
	): SessionSnapshotMetadata {
		const merged: SessionSnapshotMetadata = { ...metadata };
		const mergeRecord = <Key extends keyof SessionSnapshotMetadata>(
			key: Key,
		) => {
			const staticRecord = this.staticMetadata[key];
			const dynamicRecord = metadata[key];
			if (
				staticRecord &&
				typeof staticRecord === 'object' &&
				!Array.isArray(staticRecord)
			) {
				if (
					dynamicRecord &&
					typeof dynamicRecord === 'object' &&
					!Array.isArray(dynamicRecord)
				) {
					merged[key] = Object.freeze({
						...(staticRecord as Record<string, unknown>),
						...(dynamicRecord as Record<string, unknown>),
					}) as SessionSnapshotMetadata[Key];
					return;
				}
				merged[key] = staticRecord as SessionSnapshotMetadata[Key];
			}
		};
		mergeRecord('resources');
		mergeRecord('populations');
		mergeRecord('buildings');
		mergeRecord('developments');
		mergeRecord('stats');
		mergeRecord('phases');
		mergeRecord('triggers');
		mergeRecord('assets');
		(
			merged as unknown as { overviewContent: OverviewContentTemplate }
		).overviewContent = this.overviewContent;
		return merged;
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
