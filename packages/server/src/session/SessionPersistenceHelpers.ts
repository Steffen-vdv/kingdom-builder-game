import {
	createEngineSession,
	type EngineSession,
} from '@kingdom-builder/engine';
import type { SessionBaseOptions } from './sessionConfigAssets.js';
import type {
	PersistedSessionRecord,
	SessionStore,
	SessionStoreRecord,
} from './SessionStore.js';

export type EngineSessionOptions = Parameters<typeof createEngineSession>[0];

export type SessionRecord = PersistedSessionRecord & {
	session: EngineSession;
};

export function createEngineSessionWithOptions(
	baseOptions: SessionBaseOptions,
	devMode: boolean,
	config: EngineSessionOptions['config'] | undefined,
): EngineSession {
	const { actionCategories: _baseActionCategories, ...engineBaseOptions } =
		baseOptions;
	const sessionOptions: EngineSessionOptions = {
		...engineBaseOptions,
		devMode,
		...(config !== undefined ? { config: structuredClone(config) } : {}),
	};
	return createEngineSession(sessionOptions);
}

export function buildStoreRecord(
	sessionId: string,
	record: SessionRecord,
): SessionStoreRecord {
	return {
		sessionId,
		createdAt: record.createdAt,
		lastAccessedAt: record.lastAccessedAt,
		registries: structuredClone(record.registries),
		metadata: structuredClone(record.metadata),
		devMode: record.devMode,
		...(record.config !== undefined
			? { config: structuredClone(record.config) }
			: {}),
	};
}

export function persistSessionRecord(
	store: SessionStore | undefined,
	sessionId: string,
	record: SessionRecord,
): void {
	if (!store) {
		return;
	}
	store.save(buildStoreRecord(sessionId, record));
}

export function attachDevModePersistence(
	sessionId: string,
	session: EngineSession,
	sessions: Map<string, SessionRecord>,
	store: SessionStore | undefined,
): void {
	const originalSetDevMode = session.setDevMode.bind(session);
	session.setDevMode = (enabled: boolean) => {
		originalSetDevMode(enabled);
		const record = sessions.get(sessionId);
		if (!record) {
			return;
		}
		record.devMode = enabled;
		persistSessionRecord(store, sessionId, record);
	};
}

export function hydratePersistedSessions(
	store: SessionStore | undefined,
	baseOptions: SessionBaseOptions,
): Array<[string, SessionRecord]> {
	if (!store) {
		return [];
	}
	return store.loadAll().map((entry) => {
		const configSnapshot =
			entry.config !== undefined ? structuredClone(entry.config) : undefined;
		const session = createEngineSessionWithOptions(
			baseOptions,
			entry.devMode,
			configSnapshot,
		);
		const record: SessionRecord = {
			session,
			createdAt: entry.createdAt,
			lastAccessedAt: entry.lastAccessedAt,
			registries: structuredClone(entry.registries),
			metadata: structuredClone(entry.metadata),
			devMode: entry.devMode,
			...(configSnapshot !== undefined ? { config: configSnapshot } : {}),
		};
		return [entry.sessionId, record];
	});
}
