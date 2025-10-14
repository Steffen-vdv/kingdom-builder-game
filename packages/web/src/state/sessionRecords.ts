import type {
	SessionAdvanceResult,
	SessionRegistriesMetadata,
	SessionRegistriesPayload,
	SessionSnapshot,
} from '@kingdom-builder/protocol/session';
import {
	createRemoteSessionQueue,
	type RemoteSessionQueue,
	type RemoteSessionQueueSnapshot,
	type RemoteSessionQueueOptions,
} from './RemoteSessionQueue';
import type { SessionRegistries } from './sessionRegistries';

export interface SessionHandle {
	enqueue: RemoteSessionQueue['enqueue'];
	getLatestSnapshot(): SessionSnapshot | null;
	getLatestRegistries(): SessionRegistries | null;
	getLatestMetadata(): SessionSnapshot['metadata'] | null;
	getLatestRegistriesMetadata(): SessionRegistriesMetadata | undefined;
	performAction(actionId: string, params?: Record<string, unknown>): unknown;
	advancePhase(advance: SessionAdvanceResult): unknown;
}

export interface SessionRecord {
	sessionId: string;
	handle: SessionHandle;
	queue: RemoteSessionQueue;
	registries: SessionRegistries;
	resourceKeys: ResourceKey[];
}

export interface SessionBootstrapOptions {
	sessionId?: string;
	snapshot: SessionSnapshot;
	registriesPayload: SessionRegistriesPayload;
	registries: SessionRegistries;
	resourceKeys: ResourceKey[];
	devMode: boolean;
	playerName?: string;
}

export type ResourceKey = string;

interface SessionMirroringErrorOptions {
	cause: unknown;
	details?: Record<string, unknown>;
}

const fatalSessionErrorFlag = Symbol('session:fatal-error');
const SESSION_PREFIX = 'local-session-';

const sessions = new Map<string, SessionRecord>();

let nextSessionId = 1;

export class SessionMirroringError extends Error {
	public override readonly cause: unknown;

	public readonly details: Record<string, unknown>;

	public constructor(
		message: string,
		{ cause, details = {} }: SessionMirroringErrorOptions,
	) {
		super(message);
		this.name = 'SessionMirroringError';
		this.cause = cause;
		this.details = details;
	}
}

export function markFatalSessionError(error: unknown): void {
	if (error === null || typeof error !== 'object') {
		return;
	}
	Reflect.set(
		error as Record<PropertyKey, unknown>,
		fatalSessionErrorFlag,
		true,
	);
}

export function isFatalSessionError(error: unknown): boolean {
	if (error === null || typeof error !== 'object') {
		return false;
	}
	return Boolean(
		Reflect.get(error as Record<PropertyKey, unknown>, fatalSessionErrorFlag),
	);
}

function createSessionHandle(queue: RemoteSessionQueue): SessionHandle {
	return {
		enqueue: (task) => queue.enqueue(task),
		getLatestSnapshot: () => queue.getLatestSnapshot(),
		getLatestRegistries: () => queue.getLatestRegistries(),
		getLatestMetadata: () => queue.getLatestMetadata(),
		getLatestRegistriesMetadata: () => queue.getLatestRegistriesMetadata(),
		performAction: () => undefined,
		advancePhase: () => undefined,
	};
}

export function createSessionRecord(
	options: SessionBootstrapOptions,
): Promise<SessionRecord> {
	const sessionId = options.sessionId ?? `${SESSION_PREFIX}${nextSessionId++}`;
	const queueOptions = {
		sessionId,
		snapshot: options.snapshot,
		registries: options.registries,
		metadata: options.snapshot.metadata,
	} as RemoteSessionQueueOptions;
	if (options.registriesPayload.metadata !== undefined) {
		queueOptions.registriesMetadata = options.registriesPayload.metadata;
	}
	const queue = createRemoteSessionQueue(queueOptions);
	const handle = createSessionHandle(queue);
	const record: SessionRecord = {
		sessionId,
		handle,
		queue,
		registries: options.registries,
		resourceKeys: options.resourceKeys,
	};
	sessions.set(sessionId, record);
	return Promise.resolve(record);
}

export function getSessionRecord(sessionId: string): SessionRecord {
	const record = sessions.get(sessionId);
	if (!record) {
		const error = new Error(`Session not found: ${sessionId}`);
		markFatalSessionError(error);
		throw error;
	}
	return record;
}

function updateQueueState(
	record: SessionRecord,
	snapshot: SessionSnapshot,
	registries: SessionRegistries,
	registriesMetadata?: SessionRegistriesMetadata,
): void {
	const state: RemoteSessionQueueSnapshot = {
		snapshot,
		registries,
		metadata: snapshot.metadata,
	};
	if (registriesMetadata !== undefined) {
		state.registriesMetadata = registriesMetadata;
	}
	record.queue.updateState(state);
}

export function replaceSessionCaches(
	record: SessionRecord,
	registries: SessionRegistries,
	resourceKeys: ResourceKey[],
	snapshot: SessionSnapshot,
	registriesMetadata?: SessionRegistriesMetadata,
): void {
	record.registries = registries;
	record.resourceKeys = resourceKeys;
	updateQueueState(record, snapshot, registries, registriesMetadata);
}

export function mergeSessionCaches(
	record: SessionRecord,
	registries: SessionRegistries,
	resourceKeys: ResourceKey[],
	snapshot: SessionSnapshot,
	registriesMetadata?: SessionRegistriesMetadata,
): void {
	Object.assign(record.registries, registries);
	record.resourceKeys.splice(0, record.resourceKeys.length, ...resourceKeys);
	updateQueueState(record, snapshot, record.registries, registriesMetadata);
}

export function releaseSessionRecord(sessionId: string): void {
	sessions.delete(sessionId);
}
