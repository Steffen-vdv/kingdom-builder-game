import {
	createEngineSession,
	type EngineSession,
} from '@kingdom-builder/engine';
import type { SessionRegistriesPayload } from '@kingdom-builder/protocol';
import type { SessionStaticMetadataPayload } from './buildSessionMetadata.js';
import type { SessionRecord as StoreSessionRecord } from './SessionStore.js';
import type { SessionBaseOptions } from './sessionConfigAssets.js';

export type EngineSessionOptions = Parameters<typeof createEngineSession>[0];

export type SessionEntry = {
	session: EngineSession;
	createdAt: number;
	lastAccessedAt: number;
	registries: SessionRegistriesPayload;
	metadata: SessionStaticMetadataPayload;
	devMode: boolean;
	config?: EngineSessionOptions['config'];
};

export function buildEngineSession(
	baseOptions: SessionBaseOptions,
	devMode: boolean,
	config: EngineSessionOptions['config'] | undefined,
): EngineSession {
	const { actionCategories: _baseActionCategories, ...engineBaseOptions } =
		baseOptions;
	const sessionOptions: EngineSessionOptions = {
		...engineBaseOptions,
		devMode,
	};
	if (config !== undefined) {
		sessionOptions.config = structuredClone(config);
	}
	const session = createEngineSession(sessionOptions);
	session.setDevMode(devMode);
	return session;
}

export function createEntryFromStoreRecord(
	record: StoreSessionRecord,
	baseOptions: SessionBaseOptions,
): SessionEntry {
	const devMode = record.devMode;
	const config =
		record.config === undefined
			? undefined
			: (structuredClone(record.config) as EngineSessionOptions['config']);
	const session = buildEngineSession(baseOptions, devMode, config);
	return {
		session,
		createdAt: record.createdAt,
		lastAccessedAt: record.lastAccessedAt,
		registries: structuredClone(record.registries),
		metadata: structuredClone(record.metadata),
		devMode,
		config,
	};
}

export function createStoreRecord(
	sessionId: string,
	entry: SessionEntry,
): StoreSessionRecord {
	return {
		sessionId,
		createdAt: entry.createdAt,
		lastAccessedAt: entry.lastAccessedAt,
		devMode: entry.devMode,
		config:
			entry.config === undefined ? undefined : structuredClone(entry.config),
		registries: structuredClone(entry.registries),
		metadata: structuredClone(entry.metadata),
	};
}
