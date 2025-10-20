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
import { markFatalSessionError } from './sessionErrors';

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
const queueSeeds = new Map<string, Promise<void>>();

export class MissingSessionRecordError extends Error {
	public readonly sessionId: string;

	public constructor(sessionId: string) {
		super(`Missing session record: ${sessionId}`);
		this.name = 'MissingSessionRecordError';
		this.sessionId = sessionId;
		markFatalSessionError(this);
	}
}

type MissingRecordListener = (error: MissingSessionRecordError) => void;

const missingRecordListeners = new Set<MissingRecordListener>();

export function subscribeMissingSessionRecord(
	listener: MissingRecordListener,
): () => void {
	missingRecordListeners.add(listener);
	return () => {
		missingRecordListeners.delete(listener);
	};
}

function notifyMissingSessionRecord(
	sessionId: string,
): MissingSessionRecordError {
	const error = new MissingSessionRecordError(sessionId);
	for (const listener of missingRecordListeners) {
		try {
			listener(error);
		} catch {
			// Listener failures should not prevent other handlers.
		}
	}
	return error;
}

function getQueueSeed(sessionId: string): Promise<void> {
	let seed = queueSeeds.get(sessionId);
	if (!seed) {
		seed = Promise.resolve();
		queueSeeds.set(sessionId, seed);
	}
	return seed;
}

function setQueueSeed(sessionId: string, seed: Promise<void>): void {
	queueSeeds.set(sessionId, seed);
	const record = records.get(sessionId);
	if (record) {
		record.queueSeed = seed;
		records.set(sessionId, record);
	}
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
	const keys = extractResourceKeys(record.registries);
	record.resourceKeys.splice(0, record.resourceKeys.length, ...keys);
}

function applyMetadata(
	record: SessionStateRecord,
	metadata: SessionSnapshotMetadata,
): void {
	record.metadata = clone(metadata);
}

export function initializeSessionState(
	response: SessionCreateResponse,
): SessionStateRecord {
	const snapshot = clone(response.snapshot);
	const ruleSnapshot = clone(response.snapshot.rules);
	const registries = deserializeSessionRegistries(response.registries);
	const queueSeed = getQueueSeed(response.sessionId);
	const record: SessionStateRecord = {
		sessionId: response.sessionId,
		snapshot,
		ruleSnapshot,
		registries,
		resourceKeys: extractResourceKeys(registries),
		metadata: clone(response.snapshot.metadata),
		queueSeed,
	};
	records.set(response.sessionId, record);
	setQueueSeed(response.sessionId, queueSeed);
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
		throw notifyMissingSessionRecord(sessionId);
	}
	return record;
}

export function deleteSessionRecord(sessionId: string): void {
	records.delete(sessionId);
	queueSeeds.delete(sessionId);
}

export function clearSessionStateStore(): void {
	records.clear();
	queueSeeds.clear();
}

export function enqueueSessionTask<T>(
	sessionId: string,
	task: () => Promise<T> | T,
): Promise<T> {
	const previous = getQueueSeed(sessionId);
	const chain = previous.then(() => Promise.resolve().then(task));
	const nextSeed = chain.catch(() => {}).then(() => undefined);
	setQueueSeed(sessionId, nextSeed);
	return chain;
}
