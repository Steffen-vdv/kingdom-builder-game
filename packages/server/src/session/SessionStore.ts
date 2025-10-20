import type { SessionRegistriesPayload } from '@kingdom-builder/protocol';
import type { SessionStaticMetadataPayload } from './buildSessionMetadata.js';

export interface SessionRecord {
	sessionId: string;
	createdAt: number;
	lastAccessedAt: number;
	devMode: boolean;
	config?: unknown;
	registries: SessionRegistriesPayload;
	metadata: SessionStaticMetadataPayload;
}

export interface SessionStore {
	loadAll(): SessionRecord[];
	save(record: SessionRecord): void;
	delete(sessionId: string): void;
	close?(): void;
}
