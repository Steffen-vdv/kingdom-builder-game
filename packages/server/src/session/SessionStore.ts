import type {
	GameConfig,
	SessionRegistriesPayload,
} from '@kingdom-builder/protocol';
import type { SessionStaticMetadataPayload } from './buildSessionMetadata.js';

export interface PersistedSessionRecord {
	createdAt: number;
	lastAccessedAt: number;
	registries: SessionRegistriesPayload;
	metadata: SessionStaticMetadataPayload;
	devMode: boolean;
	config?: GameConfig;
}

export interface SessionStoreRecord extends PersistedSessionRecord {
	sessionId: string;
}

export interface SessionStore {
	loadAll(): SessionStoreRecord[];
	save(record: SessionStoreRecord): void;
	delete(sessionId: string): void;
	close?(): void;
}
