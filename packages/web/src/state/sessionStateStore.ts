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
	const record: SessionStateRecord = {
		sessionId: response.sessionId,
		snapshot,
		ruleSnapshot,
		registries,
		resourceKeys: extractResourceKeys(registries),
		metadata: clone(response.snapshot.metadata),
		queueSeed: Promise.resolve(),
	};
	records.set(response.sessionId, record);
	return record;
}

export function applySessionState(
	response: SessionStatePayload,
): SessionStateRecord {
	const record = assertSessionRecord(response.sessionId);
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

export function assertSessionRecord(sessionId: string): SessionStateRecord {
	const record = getSessionRecord(sessionId);
	if (!record) {
		throw new Error(`Missing session record: ${sessionId}`);
	}
	return record;
}

export function deleteSessionRecord(sessionId: string): void {
	records.delete(sessionId);
}

export function clearSessionStateStore(): void {
	records.clear();
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
