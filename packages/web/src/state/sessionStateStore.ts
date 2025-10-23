import type {
	SessionAdvanceResponse,
	SessionCreateResponse,
	SessionRuleSnapshot,
	SessionSnapshot,
	SessionSnapshotMetadata,
	SessionStateResponse,
	SessionRegistriesPayload,
	SessionResourceDefinition,
} from '@kingdom-builder/protocol/session';
import type { Registry } from '@kingdom-builder/protocol';
import {
	deserializeSessionRegistries,
	extractResourceKeys,
	type SessionRegistries,
} from './sessionRegistries';
import { clone } from './clone';
import { SessionMirroringError, markFatalSessionError } from './sessionErrors';

export interface SessionStateRecord {
	readonly sessionId: string;
	snapshot: SessionSnapshot;
	ruleSnapshot: SessionRuleSnapshot;
	registries: SessionRegistries;
	resourceKeys: string[];
	metadata: SessionSnapshotMetadata;
	queueSeed: Promise<void>;
}

type SessionStatePayload = SessionStateResponse | SessionAdvanceResponse;

const records = new Map<string, SessionStateRecord>();

interface SessionRecordWaiter {
	resolve: (record: SessionStateRecord) => void;
	reject: (error: unknown) => void;
}

const recordWaiters = new Map<string, Set<SessionRecordWaiter>>();

function createAbortError(signal?: AbortSignal): Error {
	const reason: unknown =
		signal && 'reason' in signal
			? (signal as { reason?: unknown }).reason
			: undefined;
	if (reason instanceof Error) {
		return reason;
	}
	if (typeof DOMException === 'function') {
		return new DOMException(
			typeof reason === 'string' ? reason : 'The operation was aborted.',
			'AbortError',
		);
	}
	const error = new Error(
		typeof reason === 'string' ? reason : 'The operation was aborted.',
	);
	error.name = 'AbortError';
	return error;
}

function createMissingSessionError(sessionId: string): SessionMirroringError {
	const error = new SessionMirroringError(
		`Missing session record: ${sessionId}`,
		{
			cause: undefined,
			details: { sessionId },
		},
	);
	markFatalSessionError(error);
	return error;
}

function notifyRecordWaiters(
	sessionId: string,
	record: SessionStateRecord,
): void {
	const waiters = recordWaiters.get(sessionId);
	if (!waiters) {
		return;
	}
	recordWaiters.delete(sessionId);
	for (const waiter of waiters) {
		waiter.resolve(record);
	}
}

function rejectRecordWaiters(sessionId: string, error: unknown): void {
	const waiters = recordWaiters.get(sessionId);
	if (!waiters) {
		return;
	}
	recordWaiters.delete(sessionId);
	for (const waiter of waiters) {
		waiter.reject(error);
	}
}

interface WaitForSessionRecordOptions {
	signal?: AbortSignal;
}

export function waitForSessionRecord(
	sessionId: string,
	options: WaitForSessionRecordOptions = {},
): Promise<SessionStateRecord> {
	if (!sessionId) {
		return Promise.reject(createMissingSessionError(sessionId));
	}
	const existing = getSessionRecord(sessionId);
	if (existing) {
		return Promise.resolve(existing);
	}
	const { signal } = options;
	return new Promise<SessionStateRecord>((resolve, reject) => {
		if (signal?.aborted) {
			reject(createAbortError(signal));
			return;
		}
		let waiters = recordWaiters.get(sessionId);
		if (!waiters) {
			waiters = new Set();
			recordWaiters.set(sessionId, waiters);
		}
		let abortHandler: (() => void) | undefined;
		const cleanup = () => {
			waiters?.delete(waiter);
			if ((waiters?.size ?? 0) === 0) {
				recordWaiters.delete(sessionId);
			}
			if (signal && abortHandler) {
				signal.removeEventListener('abort', abortHandler);
			}
		};
		const waiter: SessionRecordWaiter = {
			resolve: (record) => {
				cleanup();
				resolve(record);
			},
			reject: (error) => {
				cleanup();
				if (error instanceof Error) {
					reject(error);
					return;
				}
				reject(createAbortError(signal));
			},
		};
		abortHandler = () => {
			waiter.reject(createAbortError(signal));
		};
		waiters.add(waiter);
		if (signal) {
			signal.addEventListener('abort', abortHandler, { once: true });
		}
	});
}
function mergeRegistryEntries<DefinitionType>(
	target: Registry<DefinitionType>,
	source: Registry<DefinitionType>,
): void {
	for (const [id, definition] of source.entries()) {
		target.add(id, clone(definition));
	}
}

function applyResourceRegistry(
	target: Record<string, SessionResourceDefinition>,
	source: Record<string, SessionResourceDefinition>,
): void {
	for (const key of Object.keys(target)) {
		if (!(key in source)) {
			delete target[key];
		}
	}
	for (const [key, definition] of Object.entries(source)) {
		target[key] = clone(definition);
	}
}

function applyDefinitionRecord<TDefinition>(
	target: Record<string, TDefinition>,
	source: Record<string, TDefinition>,
): void {
	for (const key of Object.keys(target)) {
		if (!(key in source)) {
			delete target[key];
		}
	}
	for (const [key, definition] of Object.entries(source)) {
		target[key] = clone(definition);
	}
}

function applyRegistries(
	record: SessionStateRecord,
	payload: SessionRegistriesPayload,
): void {
	const next = deserializeSessionRegistries(payload);
	mergeRegistryEntries(record.registries.actions, next.actions);
	mergeRegistryEntries(
		record.registries.actionCategories,
		next.actionCategories,
	);
	mergeRegistryEntries(record.registries.buildings, next.buildings);
	mergeRegistryEntries(record.registries.developments, next.developments);
	mergeRegistryEntries(record.registries.populations, next.populations);
	applyResourceRegistry(record.registries.resources, next.resources);
	applyDefinitionRecord(record.registries.resourcesV2, next.resourcesV2);
	applyDefinitionRecord(record.registries.resourceGroups, next.resourceGroups);
	syncResourceKeys(record);
}

function applyMetadata(
	record: SessionStateRecord,
	metadata: SessionSnapshotMetadata,
): void {
	record.metadata = clone(metadata);
	syncResourceKeys(record);
}

function syncResourceKeys(record: SessionStateRecord): void {
	const orderedResourceIds = Array.isArray(record.metadata.orderedResourceIds)
		? record.metadata.orderedResourceIds
		: Array.isArray(record.snapshot.orderedResourceIds)
			? record.snapshot.orderedResourceIds
			: undefined;
	if (orderedResourceIds && orderedResourceIds.length > 0) {
		record.resourceKeys.splice(
			0,
			record.resourceKeys.length,
			...orderedResourceIds,
		);
		return;
	}
	const keys = extractResourceKeys(record.registries);
	record.resourceKeys.splice(0, record.resourceKeys.length, ...keys);
}

export function initializeSessionState(
	response: SessionCreateResponse,
): SessionStateRecord {
	const snapshot = clone(response.snapshot);
	const ruleSnapshot = clone(response.snapshot.rules);
	const registries = deserializeSessionRegistries(response.registries);
	const metadata = clone(response.snapshot.metadata);
	const record: SessionStateRecord = {
		sessionId: response.sessionId,
		snapshot,
		ruleSnapshot,
		registries,
		resourceKeys: [],
		metadata,
		queueSeed: Promise.resolve(),
	};
	syncResourceKeys(record);
	records.set(response.sessionId, record);
	notifyRecordWaiters(response.sessionId, record);
	return record;
}

export function applySessionState(
	response: SessionStatePayload,
): SessionStateRecord {
	const record = getSessionRecord(response.sessionId);
	if (!record) {
		return initializeSessionState(response);
	}
	record.snapshot = clone(response.snapshot);
	record.ruleSnapshot = clone(response.snapshot.rules);
	applyRegistries(record, response.registries);
	applyMetadata(record, response.snapshot.metadata);
	records.set(response.sessionId, record);
	notifyRecordWaiters(response.sessionId, record);
	return record;
}

export function updateSessionSnapshot(
	sessionId: string,
	snapshot: SessionSnapshot,
): SessionStateRecord {
	const record = assertSessionRecord(sessionId);
	record.snapshot = clone(snapshot);
	record.ruleSnapshot = clone(snapshot.rules);
	applyMetadata(record, snapshot.metadata);
	records.set(sessionId, record);
	notifyRecordWaiters(sessionId, record);
	return record;
}

export function updateRegistries(
	sessionId: string,
	payload: SessionRegistriesPayload,
): SessionRegistries {
	const record = assertSessionRecord(sessionId);
	applyRegistries(record, payload);
	return record.registries;
}

export function updateMetadata(
	sessionId: string,
	metadata: SessionSnapshotMetadata,
): SessionSnapshotMetadata {
	const record = assertSessionRecord(sessionId);
	applyMetadata(record, metadata);
	return record.metadata;
}

export function getSessionRecord(
	sessionId: string,
): SessionStateRecord | undefined {
	return records.get(sessionId);
}

export function getSessionSnapshot(sessionId: string): SessionSnapshot {
	const record = assertSessionRecord(sessionId);
	return clone(record.snapshot);
}

export function assertSessionRecord(sessionId: string): SessionStateRecord {
	const record = getSessionRecord(sessionId);
	if (!record) {
		throw createMissingSessionError(sessionId);
	}
	return record;
}

export function deleteSessionRecord(sessionId: string): void {
	const removed = records.delete(sessionId);
	if (removed) {
		rejectRecordWaiters(sessionId, createMissingSessionError(sessionId));
	}
}

export function clearSessionStateStore(): void {
	const pendingSessions = new Set(recordWaiters.keys());
	records.clear();
	for (const sessionId of pendingSessions) {
		rejectRecordWaiters(sessionId, createMissingSessionError(sessionId));
	}
}

export function enqueueSessionTask<T>(
	sessionId: string,
	task: () => Promise<T> | T,
): Promise<T> {
	const record = assertSessionRecord(sessionId);
	const chain = record.queueSeed.then(() => Promise.resolve().then(task));
	record.queueSeed = chain.catch(() => {}).then(() => undefined);
	return chain;
}
