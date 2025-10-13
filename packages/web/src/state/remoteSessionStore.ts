import type { EngineSession } from '@kingdom-builder/engine';
import type {
	SessionRegistriesMetadata,
	SessionSnapshot,
	SessionSnapshotMetadata,
} from '@kingdom-builder/protocol/session';
import {
	createRemoteSessionQueue,
	type RemoteSessionQueue,
	type RemoteSessionQueueSnapshot,
} from './RemoteSessionQueue';
import {
	extractResourceKeys,
	type SessionRegistries,
} from './sessionRegistries';
import type { ResourceKey } from './legacySessionBootstrap';

export interface SessionHandle {
	enqueue<T>(task: () => Promise<T> | T): Promise<T>;
	getLatestSnapshot(): SessionSnapshot | null;
	getLatestRegistries(): SessionRegistries | null;
	getLatestMetadata(): SessionSnapshotMetadata | null;
	getLatestRegistriesMetadata(): SessionRegistriesMetadata | undefined;
}

export interface SessionRecord {
	readonly sessionId: string;
	readonly queue: RemoteSessionQueue;
	readonly handle: SessionHandle;
	readonly legacySession: EngineSession;
	registries: SessionRegistries;
	resourceKeys: ResourceKey[];
}

interface RegisterSessionOptions {
	sessionId: string;
	legacySession: EngineSession;
	registries: SessionRegistries;
	resourceKeys: ResourceKey[];
	snapshot: SessionSnapshot;
	metadata: SessionSnapshotMetadata;
}

const sessions = new Map<string, SessionRecord>();

function createSessionHandle(queue: RemoteSessionQueue): SessionHandle {
	return {
		enqueue: <T>(task: () => Promise<T> | T) => queue.enqueue(task),
		getLatestSnapshot: () => queue.getLatestSnapshot(),
		getLatestRegistries: () => queue.getLatestRegistries(),
		getLatestMetadata: () => queue.getLatestMetadata(),
		getLatestRegistriesMetadata: () => queue.getLatestRegistriesMetadata(),
	};
}

function createQueueState(
	snapshot: SessionSnapshot,
	registries: SessionRegistries,
	metadata: SessionSnapshotMetadata,
	registriesMetadata?: SessionRegistriesMetadata,
): RemoteSessionQueueSnapshot {
	const state: RemoteSessionQueueSnapshot = {
		snapshot,
		registries,
		metadata,
	};
	if (registriesMetadata !== undefined) {
		state.registriesMetadata = registriesMetadata;
	}
	return state;
}

export function registerSession(
	options: RegisterSessionOptions,
): SessionRecord {
	const {
		sessionId,
		legacySession,
		registries,
		resourceKeys,
		snapshot,
		metadata,
	} = options;
	const queue = createRemoteSessionQueue({
		sessionId,
		snapshot,
		registries,
		metadata,
	});
	const handle = createSessionHandle(queue);
	const record: SessionRecord = {
		sessionId,
		queue,
		handle,
		legacySession,
		registries,
		resourceKeys,
	};
	sessions.set(sessionId, record);
	return record;
}

export function getSessionRecord(sessionId: string): SessionRecord {
	const record = sessions.get(sessionId);
	if (!record) {
		throw new Error(`Session not found: ${sessionId}`);
	}
	return record;
}

export function updateRecordState(
	record: SessionRecord,
	snapshot: SessionSnapshot,
	registries: SessionRegistries,
	metadata: SessionSnapshotMetadata,
	registriesMetadata?: SessionRegistriesMetadata,
): void {
	record.registries = registries;
	record.resourceKeys = extractResourceKeys(registries);
	record.queue.updateState(
		createQueueState(snapshot, registries, metadata, registriesMetadata),
	);
}

export function updateRecordSnapshot(
	record: SessionRecord,
	snapshot: SessionSnapshot,
): void {
	record.queue.updateSnapshot(snapshot);
}

export function releaseSessionRecord(sessionId: string): void {
	sessions.delete(sessionId);
}
